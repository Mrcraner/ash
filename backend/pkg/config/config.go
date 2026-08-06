package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds shared service configuration loaded from YAML + env overrides.
type Config struct {
	Server  ServerConfig  `mapstructure:"server"`
	MySQL   MySQLConfig   `mapstructure:"mysql"`
	Log     LogConfig     `mapstructure:"log"`
	Service ServiceConfig `mapstructure:"service"`
	Auth    AuthConfig    `mapstructure:"auth"`
	Local   LocalConfig   `mapstructure:"local"`
}

// LocalConfig is used by ash-runtime (Pro/Cinema local client process).
type LocalConfig struct {
	// CharactersDir is the Character Pack root (relative to process cwd or absolute).
	CharactersDir string `mapstructure:"characters_dir"`
}

// AuthConfig controls cookie sessions (user-service) and short-lived access JWTs.
type AuthConfig struct {
	CookieName     string `mapstructure:"cookie_name"`
	CookiePath     string `mapstructure:"cookie_path"`
	CookieDomain   string `mapstructure:"cookie_domain"`
	CookieSecure   bool   `mapstructure:"cookie_secure"`
	CookieSameSite string `mapstructure:"cookie_same_site"` // lax | strict | none
	SessionTTLDays int    `mapstructure:"session_ttl_days"`
	// LastSeenMinIntervalSec throttles session last_seen writes.
	LastSeenMinIntervalSec int `mapstructure:"last_seen_min_interval_sec"`
	// LoginRateLimitPerMin / RegisterRateLimitPerMin are per-IP sliding windows.
	LoginRateLimitPerMin    int `mapstructure:"login_rate_limit_per_min"`
	RegisterRateLimitPerMin int `mapstructure:"register_rate_limit_per_min"`
	// JWTSecret signs short-lived access tokens for agent/community (HS256).
	JWTSecret string `mapstructure:"jwt_secret"`
	// AccessCookieName holds the short JWT (HttpOnly). Empty → ash_at.
	AccessCookieName string `mapstructure:"access_cookie_name"`
	// AccessTTLMinutes is access JWT lifetime (default 15).
	AccessTTLMinutes int `mapstructure:"access_ttl_minutes"`
}

type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"` // debug | release | test
}

type MySQLConfig struct {
	// Driver: mysql (default, all deployed envs) | sqlite (optional local smoke without MySQL).
	Driver       string `mapstructure:"driver"`
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	User         string `mapstructure:"user"`
	Password     string `mapstructure:"password"`
	Database     string `mapstructure:"database"`
	Charset      string `mapstructure:"charset"`
	SQLitePath   string `mapstructure:"sqlite_path"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // json | console
}

type ServiceConfig struct {
	Name string `mapstructure:"name"`
}

func (m MySQLConfig) DSN() string {
	charset := m.Charset
	if charset == "" {
		charset = "utf8mb4"
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		m.User, m.Password, m.Host, m.Port, m.Database, charset)
}

func (s ServerConfig) Addr() string {
	host := s.Host
	if host == "" {
		host = "0.0.0.0"
	}
	return fmt.Sprintf("%s:%d", host, s.Port)
}

// Load reads config from path (YAML) and allows ASH_* env overrides.
// Example: ASH_MYSQL_HOST=127.0.0.1
func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)
	v.SetEnvPrefix("ASH")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	return &cfg, nil
}
