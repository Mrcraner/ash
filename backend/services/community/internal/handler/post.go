package handler

import (
	"errors"
	"strconv"

	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/Mrcraner/ash/backend/services/community/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PostHandler struct {
	svc *service.PostService
}

func NewPostHandler(svc *service.PostService) *PostHandler {
	return &PostHandler{svc: svc}
}

type createPostReq struct {
	Title   string `json:"title" binding:"required,min=1,max=200"`
	Content string `json:"content" binding:"required,min=1"`
}

func (h *PostHandler) Create(c *gin.Context) {
	var req createPostReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	row, err := h.svc.Create(req.Title, req.Content)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, row)
}

func (h *PostHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	row, err := h.svc.Get(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "post not found")
			return
		}
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, row)
}

func (h *PostHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	rows, err := h.svc.List(limit)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, gin.H{"items": rows})
}

func Health(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "community-service",
		"status":  "up",
	})
}

func Hello(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "community-service",
		"message": "hello from community-service",
	})
}
