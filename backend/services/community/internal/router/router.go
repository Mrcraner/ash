package router

import (
	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/community/internal/handler"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, posts *handler.PostHandler, authCfg config.AuthConfig) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", handler.Health)

	api := r.Group("/api/v1")
	{
		api.GET("/hello", handler.Hello)
		// Guest-readable; writes require short access JWT.
		api.GET("/posts", posts.List)
		api.GET("/posts/:id", posts.Get)

		authed := api.Group("")
		authed.Use(middleware.RequireAccessJWT(authCfg.JWTSecret, authCfg.AccessCookieName))
		{
			authed.POST("/posts", posts.Create)
		}
	}
	return r
}
