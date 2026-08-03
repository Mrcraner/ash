package model

import "time"

// HelloMessage is the minimal smoke-test model for local MySQL R/W verification.
// Real domain models (User, Profile, etc.) will replace this later.
type HelloMessage struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Service   string    `gorm:"size:64;not null;index" json:"service"`
	Message   string    `gorm:"size:512;not null" json:"message"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (HelloMessage) TableName() string {
	return "hello_messages"
}
