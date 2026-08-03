package router

import (
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/user/internal/handler"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, hello *handler.HelloHandler) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", handler.Health)

	api := r.Group("/api/v1")
	{
		api.POST("/hello", hello.Create)
		api.GET("/hello", hello.List)
		api.GET("/hello/:id", hello.Get)
	}
	return r
}
