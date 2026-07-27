package handler

import (
	"net/http"

	"github.com/diagdesk/device-gateway/internal/middleware"
	"github.com/diagdesk/device-gateway/internal/service"
	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	svc *service.MessageService
}

func NewMessageHandler(svc *service.MessageService) *MessageHandler {
	return &MessageHandler{svc: svc}
}

func (h *MessageHandler) ListMessages(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	list, err := h.svc.ListMessages(
		c.Request.Context(),
		tenantID,
		c.Query("connection_id"),
		c.Query("from"),
		c.Query("to"),
		c.Query("status"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *MessageHandler) ListUnmatched(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	list, err := h.svc.ListUnmatched(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *MessageHandler) MatchResult(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	userID := c.GetString(middleware.UserIDKey)
	messageID := c.Param("message_id")

	var req struct {
		AccessionID string `json:"accession_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.svc.MatchResult(c.Request.Context(), messageID, req.AccessionID, userID, tenantID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		default:
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, result)
}
