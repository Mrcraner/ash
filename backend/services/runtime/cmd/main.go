package main

import (
	"os"

	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/pkg/logger"
	"github.com/Mrcraner/ash/backend/services/runtime/internal/handler"
	"github.com/Mrcraner/ash/backend/services/runtime/internal/router"
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

	charsDir := cfg.Local.CharactersDir
	if v := os.Getenv("ASH_CHARACTERS_DIR"); v != "" {
		charsDir = v
	}

	gin.SetMode(cfg.Server.Mode)
	local := handler.NewLocalHandler(charsDir)
	r := router.New(log, local)

	addr := cfg.Server.Addr()
	log.Sugar().Infow("ash-runtime starting", "addr", addr, "characters_dir", local.CharactersDir)
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
