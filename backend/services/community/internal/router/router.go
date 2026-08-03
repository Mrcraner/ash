package router

import (
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/community/internal/handler"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, posts *handler.PostHandler) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", handler.Health)

	api := r.Group("/api/v1")
	{
		api.GET("/hello", handler.Hello)
		api.POST("/posts", posts.Create)
		api.GET("/posts", posts.List)
		api.GET("/posts/:id", posts.Get)
	}
	return r
}
