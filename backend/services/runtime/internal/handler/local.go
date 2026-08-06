package handler

import (
	"path/filepath"

	"github.com/Mrcraner/ash/backend/pkg/response"
	"github.com/Mrcraner/ash/backend/services/runtime/internal/doctor"
	"github.com/gin-gonic/gin"
)

type LocalHandler struct {
	CharactersDir string
}

func NewLocalHandler(charactersDir string) *LocalHandler {
	abs := charactersDir
	if charactersDir != "" {
		if a, err := filepath.Abs(charactersDir); err == nil {
			abs = a
		}
	}
	return &LocalHandler{CharactersDir: abs}
}

func (h *LocalHandler) Health(c *gin.Context) {
	response.OK(c, gin.H{
		"service": "ash-runtime",
		"status":  "up",
		"phase":   "P0",
	})
}

func (h *LocalHandler) Doctor(c *gin.Context) {
	response.OK(c, doctor.Run(h.CharactersDir))
}
