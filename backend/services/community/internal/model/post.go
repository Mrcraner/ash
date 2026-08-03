package model

import "time"

// Post is a placeholder community model for smoke-test R/W.
// Full community domain models will be added after API design.
type Post struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Title     string    `gorm:"size:200;not null" json:"title"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Post) TableName() string {
	return "community_posts"
}
