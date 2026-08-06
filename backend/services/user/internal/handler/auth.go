package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Mrcraner/ash/backend/pkg/auth"
	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/Mrcraner/ash/backend/services/user/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc             *service.AuthService
	cfg             config.AuthConfig
	loginLimiter    *auth.SlidingWindowLimiter
	registerLimiter *auth.SlidingWindowLimiter
}

func NewAuthHandler(svc *service.AuthService, cfg config.AuthConfig) *AuthHandler {
	loginLimit := cfg.LoginRateLimitPerMin
	if loginLimit <= 0 {
		loginLimit = 20
	}
	regLimit := cfg.RegisterRateLimitPerMin
	if regLimit <= 0 {
		regLimit = 10
	}
	return &AuthHandler{
		svc:             svc,
		cfg:             cfg,
		loginLimiter:    auth.NewSlidingWindowLimiter(loginLimit, time.Minute),
		registerLimiter: auth.NewSlidingWindowLimiter(regLimit, time.Minute),
	}
}

type registerReq struct {
	Nickname        string `json:"nickname" binding:"required"`
	Username        string `json:"username" binding:"required"`
	Password        string `json:"password" binding:"required"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
}

type loginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	if !h.registerLimiter.Allow(c.ClientIP()) {
		response.TooManyRequests(c, "注册操作过于频繁，请稍后再试")
		return
	}
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请完整填写昵称、用户名、密码和确认密码")
		return
	}
	result, err := h.svc.Register(service.RegisterInput{
		Nickname:        strings.TrimSpace(req.Nickname),
		Username:        strings.TrimSpace(req.Username),
		Password:        req.Password,
		ConfirmPassword: req.ConfirmPassword,
		UserAgent:       c.Request.UserAgent(),
		ClientIP:        c.ClientIP(),
	})
	if err != nil {
		h.mapAuthErr(c, err)
		return
	}
	h.issueCookies(c, result)
	response.OK(c, result.User)
}

func (h *AuthHandler) Login(c *gin.Context) {
	if !h.loginLimiter.Allow(c.ClientIP()) {
		response.TooManyRequests(c, "登录尝试过于频繁，请稍后再试")
		return
	}
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请填写用户名和密码")
		return
	}
	result, err := h.svc.Login(service.LoginInput{
		Username:  strings.TrimSpace(req.Username),
		Password:  req.Password,
		UserAgent: c.Request.UserAgent(),
		ClientIP:  c.ClientIP(),
	})
	if err != nil {
		h.mapAuthErr(c, err)
		return
	}
	h.issueCookies(c, result)
	response.OK(c, result.User)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, _ := c.Cookie(h.cookieName())
	_ = h.svc.Logout(token)
	h.clearAuthCookies(c)
	response.OK(c, gin.H{"logged_out": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		response.Unauthorized(c, "请先登录")
		return
	}
	user, err := h.svc.Me(userID)
	if err != nil {
		h.mapAuthErr(c, err)
		return
	}
	sessionID, _ := c.Get(middleware.ContextSessionID)
	sid, _ := sessionID.(string)
	h.setAccessCookie(c, user.ID, sid, user.Username)
	response.OK(c, user)
}

// Refresh mints a new short access JWT from a valid session cookie.
func (h *AuthHandler) Refresh(c *gin.Context) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		response.Unauthorized(c, "请先登录")
		return
	}
	user, err := h.svc.Me(userID)
	if err != nil {
		h.mapAuthErr(c, err)
		return
	}
	sessionID, _ := c.Get(middleware.ContextSessionID)
	sid, _ := sessionID.(string)
	if err := h.setAccessCookie(c, user.ID, sid, user.Username); err != nil {
		response.Internal(c, "登录凭证生成失败，请稍后重试")
		return
	}
	response.OK(c, user)
}

func (h *AuthHandler) mapAuthErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrUsernameTaken):
		response.Conflict(c, "用户名已被使用")
	case errors.Is(err, service.ErrInvalidCredentials):
		response.Unauthorized(c, "用户名或密码错误")
	case errors.Is(err, service.ErrUserDisabled):
		response.Forbidden(c, "账号已被禁用")
	case errors.Is(err, service.ErrValidation):
		response.BadRequest(c, err.Error())
	case errors.Is(err, service.ErrSessionInvalid):
		response.Unauthorized(c, "登录状态无效或已过期，请重新登录")
	default:
		response.Internal(c, "服务器繁忙，请稍后重试")
	}
}

func (h *AuthHandler) issueCookies(c *gin.Context, result *service.SessionResult) {
	h.setSessionCookie(c, result.Token, result.ExpiresAt)
	_ = h.setAccessCookie(c, result.User.ID, result.SessionID, result.User.Username)
}

func (h *AuthHandler) setSessionCookie(c *gin.Context, token string, expires time.Time) {
	maxAge := int(time.Until(expires).Seconds())
	if maxAge < 0 {
		maxAge = 0
	}
	c.SetSameSite(h.sameSite())
	c.SetCookie(h.cookieName(), token, maxAge, h.cookiePath(), h.cfg.CookieDomain, h.cfg.CookieSecure, true)
}

func (h *AuthHandler) setAccessCookie(c *gin.Context, userID, sessionID, username string) error {
	token, expires, err := auth.IssueAccessToken(h.cfg.JWTSecret, userID, sessionID, username, h.cfg.AccessTTLMinutes)
	if err != nil {
		return err
	}
	maxAge := int(time.Until(expires).Seconds())
	if maxAge < 0 {
		maxAge = 0
	}
	c.SetSameSite(h.sameSite())
	c.SetCookie(h.accessCookieName(), token, maxAge, h.cookiePath(), h.cfg.CookieDomain, h.cfg.CookieSecure, true)
	return nil
}

func (h *AuthHandler) clearAuthCookies(c *gin.Context) {
	middleware.ClearSessionCookie(c, h.cookieName(), h.cookiePath(), h.cfg.CookieDomain, h.cfg.CookieSecure, h.sameSite())
	middleware.ClearSessionCookie(c, h.accessCookieName(), h.cookiePath(), h.cfg.CookieDomain, h.cfg.CookieSecure, h.sameSite())
}

func (h *AuthHandler) cookieName() string {
	if h.cfg.CookieName != "" {
		return h.cfg.CookieName
	}
	return "ash_sid"
}

func (h *AuthHandler) accessCookieName() string {
	if h.cfg.AccessCookieName != "" {
		return h.cfg.AccessCookieName
	}
	return "ash_at"
}

func (h *AuthHandler) cookiePath() string {
	if h.cfg.CookiePath != "" {
		return h.cfg.CookiePath
	}
	return "/"
}

func (h *AuthHandler) sameSite() http.SameSite {
	switch strings.ToLower(h.cfg.CookieSameSite) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}
