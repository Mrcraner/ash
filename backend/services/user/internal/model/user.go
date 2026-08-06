package model

import "time"

const (
	UserStatusActive   = "active"
	UserStatusDisabled = "disabled"
)

// User is the account identity for ASH.
type User struct {
	ID           string    `gorm:"primaryKey;size:26" json:"id"`
	Username     string    `gorm:"size:32;not null;uniqueIndex" json:"username"`
	Nickname     string    `gorm:"size:32;not null;index" json:"nickname"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Status       string    `gorm:"size:16;not null;default:active;index" json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }

// Session is a server-side login session (cookie stores opaque token only).
type Session struct {
	ID          string     `gorm:"primaryKey;size:26" json:"id"`
	UserID      string     `gorm:"size:26;not null;index:idx_sessions_user_active" json:"user_id"`
	TokenHash   string     `gorm:"size:64;not null;uniqueIndex" json:"-"`
	Fingerprint string     `gorm:"size:64;not null" json:"-"`
	ExpiresAt   time.Time  `gorm:"not null;index" json:"expires_at"`
	RevokedAt   *time.Time `gorm:"index:idx_sessions_user_active" json:"revoked_at,omitempty"`
	LastSeenAt  time.Time  `gorm:"not null" json:"last_seen_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (Session) TableName() string { return "sessions" }
