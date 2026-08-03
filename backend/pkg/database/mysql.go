package database

import (
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/Mrcraner/ash/backend/pkg/config"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func New(cfg config.MySQLConfig) (*gorm.DB, error) {
	dialector, err := openDialector(cfg)
	if err != nil {
		return nil, err
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}

	maxIdle := cfg.MaxIdleConns
	if maxIdle <= 0 {
		maxIdle = 5
	}
	maxOpen := cfg.MaxOpenConns
	if maxOpen <= 0 {
		maxOpen = 20
	}

	sqlDB.SetMaxIdleConns(maxIdle)
	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}

// NewMySQL keeps the historical name for callers; prefer New.
func NewMySQL(cfg config.MySQLConfig) (*gorm.DB, error) {
	return New(cfg)
}

func openDialector(cfg config.MySQLConfig) (gorm.Dialector, error) {
	switch cfg.Driver {
	case "", "mysql":
		return mysql.Open(cfg.DSN()), nil
	case "sqlite":
		path := cfg.SQLitePath
		if path == "" {
			path = "ash_local.db"
		}
		return sqlite.Open(path), nil
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", cfg.Driver)
	}
}
