package handler

import (
	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

func Health(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "agent-service",
		"status":  "up",
	})
}

// Hello is a placeholder for future LLM / voice agent APIs.
func Hello(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "agent-service",
		"message": "hello from agent-service",
		"hint":    "LLM / speech integrations will be added after API specs are defined",
	})
}
