package handler

import (
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

func Health(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "agent-service",
		"status":  "up",
	})
}

// Hello is a placeholder for future LLM / voice agent APIs (public / guest-ok).
func Hello(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "agent-service",
		"message": "hello from agent-service",
		"hint":    "LLM / speech integrations will be added after API specs are defined",
	})
}

// SecurePing verifies short access JWT wiring for authenticated agent calls.
func SecurePing(c *gin.Context) {
	uid, _ := middleware.UserIDFromContext(c)
	uname, _ := c.Get(middleware.ContextUsername)
	response.OK(c, gin.H{
		"service":  "agent-service",
		"message":  "access granted",
		"user_id":  uid,
		"username": uname,
	})
}
