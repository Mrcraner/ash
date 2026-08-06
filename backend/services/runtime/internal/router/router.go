package router

import (
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/runtime/internal/handler"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, local *handler.LocalHandler) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", local.Health)

	api := r.Group("/api/local/v1")
	{
		api.GET("/health", local.Health)
		api.GET("/doctor", local.Doctor)
	}
	return r
}
