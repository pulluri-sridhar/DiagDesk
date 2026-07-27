package handler

import (
	"net/http"

	"github.com/diagdesk/device-gateway/internal/middleware"
	"github.com/diagdesk/device-gateway/internal/service"
	"github.com/gin-gonic/gin"
)

type WorklistHandler struct {
	svc *service.WorklistService
}

func NewWorklistHandler(svc *service.WorklistService) *WorklistHandler {
	return &WorklistHandler{svc: svc}
}

func (h *WorklistHandler) Push(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	connectionID := c.Param("connection_id")

	var req service.PushWorklistRequest
	// ShouldBindJSON is optional here — empty body means "all pending"
	_ = c.ShouldBindJSON(&req)

	resp, err := h.svc.Push(c.Request.Context(), connectionID, tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}
