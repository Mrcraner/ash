package logger

import (
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func New(level, format string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	if strings.ToLower(format) == "console" {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	lvl := zapcore.InfoLevel
	_ = lvl.UnmarshalText([]byte(level))
	cfg.Level = zap.NewAtomicLevelAt(lvl)

	return cfg.Build()
}
