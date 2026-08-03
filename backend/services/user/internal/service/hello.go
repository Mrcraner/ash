package service

import (
	"fmt"

	"github.com/Mrcraner/ash/backend/services/user/internal/model"
	"gorm.io/gorm"
)

type HelloService struct {
	db *gorm.DB
}

func NewHelloService(db *gorm.DB) *HelloService {
	return &HelloService{db: db}
}

func (s *HelloService) Create(message string) (*model.HelloMessage, error) {
	row := &model.HelloMessage{
		Service: "user-service",
		Message: message,
	}
	if err := s.db.Create(row).Error; err != nil {
		return nil, fmt.Errorf("create hello: %w", err)
	}
	return row, nil
}

func (s *HelloService) Get(id uint64) (*model.HelloMessage, error) {
	var row model.HelloMessage
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *HelloService) List(limit int) ([]model.HelloMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var rows []model.HelloMessage
	if err := s.db.Order("id desc").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
