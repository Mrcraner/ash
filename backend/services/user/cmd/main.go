package main

import (
	"fmt"
	"os"

	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/database"
	"github.com/Mrcraner/ash/backend/pkg/logger"
	"github.com/Mrcraner/ash/backend/services/user/internal/handler"
	"github.com/Mrcraner/ash/backend/services/user/internal/model"
	"github.com/Mrcraner/ash/backend/services/user/internal/router"
	"github.com/Mrcraner/ash/backend/services/user/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfgPath := envOr("ASH_CONFIG", "configs/config.yaml")
	cfg, err := config.Load(cfgPath)
	if err != nil {
		panic(err)
	}

	log, err := logger.New(cfg.Log.Level, cfg.Log.Format)
	if err != nil {
		panic(err)
	}
	defer log.Sync() //nolint:errcheck

	gin.SetMode(cfg.Server.Mode)

	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		panic(fmt.Errorf("mysql: %w", err))
	}
	if err := db.AutoMigrate(&model.HelloMessage{}); err != nil {
		panic(fmt.Errorf("migrate: %w", err))
	}

	helloSvc := service.NewHelloService(db)
	helloH := handler.NewHelloHandler(helloSvc)
	r := router.New(log, helloH)

	addr := cfg.Server.Addr()
	log.Sugar().Infow("user-service starting", "addr", addr)
	if err := r.Run(addr); err != nil {
		panic(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
