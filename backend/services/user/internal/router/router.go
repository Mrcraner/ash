package router

import (
	"github.com/Mrcraner/ash/backend/pkg/middleware"
	"github.com/Mrcraner/ash/backend/services/user/internal/handler"
	"github.com/Mrcraner/ash/backend/services/user/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func New(log *zap.Logger, hello *handler.HelloHandler, authH *handler.AuthHandler, authSvc *service.AuthService, cookieName string) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(log), middleware.RequestID(), middleware.ZapLogger(log), middleware.CORS())

	r.GET("/health", handler.Health)

	api := r.Group("/api/v1")
	{
		api.POST("/hello", hello.Create)
		api.GET("/hello", hello.List)
		api.GET("/hello/:id", hello.Get)

		auth := api.Group("/auth")
		{
			auth.POST("/register", authH.Register)
			auth.POST("/login", authH.Login)
			auth.POST("/logout", authH.Logout)
			auth.GET("/me", middleware.RequireSession(cookieName, authSvc), authH.Me)
			auth.POST("/refresh", middleware.RequireSession(cookieName, authSvc), authH.Refresh)
		}
	}
	return r
}
