package middleware

import (
	"strings"

	"github.com/Mrcraner/ash/backend/pkg/auth"
	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

const (
	ContextUsername  = "auth_username"
	ContextAccessSID = "auth_access_sid"
)

// RequireAccessJWT validates short-lived JWT from Authorization Bearer or access cookie.
// Used by agent/community for fast local auth (no DB hop).
func RequireAccessJWT(secret, accessCookieName string) gin.HandlerFunc {
	if accessCookieName == "" {
		accessCookieName = "ash_at"
	}
	return func(c *gin.Context) {
		token := bearerToken(c)
		if token == "" {
			token, _ = c.Cookie(accessCookieName)
		}
		claims, err := auth.ParseAccessToken(secret, token)
		if err != nil {
			response.Unauthorized(c, "访问凭证无效或已过期，请重新登录")
			c.Abort()
			return
		}
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextAccessSID, claims.SessionID)
		c.Set(ContextUsername, claims.Username)
		c.Next()
	}
}

// OptionalAccessJWT populates identity when a valid token is present; never rejects.
func OptionalAccessJWT(secret, accessCookieName string) gin.HandlerFunc {
	if accessCookieName == "" {
		accessCookieName = "ash_at"
	}
	return func(c *gin.Context) {
		token := bearerToken(c)
		if token == "" {
			token, _ = c.Cookie(accessCookieName)
		}
		if token == "" {
			c.Next()
			return
		}
		claims, err := auth.ParseAccessToken(secret, token)
		if err == nil {
			c.Set(ContextUserID, claims.UserID)
			c.Set(ContextAccessSID, claims.SessionID)
			c.Set(ContextUsername, claims.Username)
		}
		c.Next()
	}
}

func bearerToken(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if h == "" {
		return ""
	}
	const prefix = "Bearer "
	if strings.HasPrefix(h, prefix) {
		return strings.TrimSpace(h[len(prefix):])
	}
	return ""
}
