package main

import (
	"os"

	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/logger"
	"github.com/Mrcraner/ash/backend/services/agent/internal/router"
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
	r := router.New(log)

	addr := cfg.Server.Addr()
	log.Sugar().Infow("agent-service starting", "addr", addr)
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
