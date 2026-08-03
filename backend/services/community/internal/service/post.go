package service

import (
	"fmt"

	"github.com/Mrcraner/ash/backend/services/community/internal/model"
	"gorm.io/gorm"
)

type PostService struct {
	db *gorm.DB
}

func NewPostService(db *gorm.DB) *PostService {
	return &PostService{db: db}
}

func (s *PostService) Create(title, content string) (*model.Post, error) {
	row := &model.Post{Title: title, Content: content}
	if err := s.db.Create(row).Error; err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	return row, nil
}

func (s *PostService) List(limit int) ([]model.Post, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var rows []model.Post
	if err := s.db.Order("id desc").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *PostService) Get(id uint64) (*model.Post, error) {
	var row model.Post
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}
