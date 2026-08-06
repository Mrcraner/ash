package router

import (
	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/agent/internal/handler"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, authCfg config.AuthConfig) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", handler.Health)

	api := r.Group("/api/v1")
	{
		api.GET("/hello", handler.Hello)
		secure := api.Group("/secure")
		secure.Use(middleware.RequireAccessJWT(authCfg.JWTSecret, authCfg.AccessCookieName))
		{
			secure.GET("/ping", handler.SecurePing)
		}
	}
	return r
}
