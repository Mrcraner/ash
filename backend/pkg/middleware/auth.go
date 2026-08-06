package middleware

import (
	"net/http"

	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

const (
	ContextUserID    = "auth_user_id"
	ContextSessionID = "auth_session_id"
)

// SessionValidator resolves an opaque session cookie into user/session IDs.
type SessionValidator interface {
	ValidateSession(token, userAgent, clientIP string) (userID, sessionID string, err error)
}

// RequireSession enforces a valid ash session cookie.
func RequireSession(cookieName string, v SessionValidator) gin.HandlerFunc {
	if cookieName == "" {
		cookieName = "ash_sid"
	}
	return func(c *gin.Context) {
		token, err := c.Cookie(cookieName)
		if err != nil || token == "" {
			response.Unauthorized(c, "请先登录")
			c.Abort()
			return
		}
		userID, sessionID, err := v.ValidateSession(token, c.Request.UserAgent(), c.ClientIP())
		if err != nil {
			response.Unauthorized(c, "登录状态无效或已过期，请重新登录")
			c.Abort()
			return
		}
		c.Set(ContextUserID, userID)
		c.Set(ContextSessionID, sessionID)
		c.Next()
	}
}

// UserIDFromContext returns the authenticated user id, if any.
func UserIDFromContext(c *gin.Context) (string, bool) {
	v, ok := c.Get(ContextUserID)
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok && s != ""
}

// ClearSessionCookie clears the session cookie on the response.
func ClearSessionCookie(c *gin.Context, name, path, domain string, secure bool, sameSite http.SameSite) {
	if name == "" {
		name = "ash_sid"
	}
	if path == "" {
		path = "/"
	}
	c.SetSameSite(sameSite)
	c.SetCookie(name, "", -1, path, domain, secure, true)
}
