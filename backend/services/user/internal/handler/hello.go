package handler

import (
	"errors"
	"strconv"

	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/Mrcraner/ash/backend/services/user/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HelloHandler struct {
	svc *service.HelloService
}

func NewHelloHandler(svc *service.HelloService) *HelloHandler {
	return &HelloHandler{svc: svc}
}

type createHelloReq struct {
	Message string `json:"message" binding:"required,min=1,max=512"`
}

func (h *HelloHandler) Create(c *gin.Context) {
	var req createHelloReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	row, err := h.svc.Create(req.Message)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, row)
}

func (h *HelloHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	row, err := h.svc.Get(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "hello message not found")
			return
		}
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, row)
}

func (h *HelloHandler) List(c *gin.Context) {
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
		"service": "user-service",
		"status":  "up",
	})
}
