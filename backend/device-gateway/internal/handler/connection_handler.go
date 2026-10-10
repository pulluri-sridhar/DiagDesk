package handler

import (
	"net/http"

	"github.com/diagdesk/device-gateway/internal/middleware"
	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/diagdesk/device-gateway/internal/service"
	"github.com/gin-gonic/gin"
)

type ConnectionHandler struct {
	svc *service.ConnectionService
}

func NewConnectionHandler(svc *service.ConnectionService) *ConnectionHandler {
	return &ConnectionHandler{svc: svc}
}

func (h *ConnectionHandler) Register(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)

	var req model.RegisterConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dc, err := h.svc.Register(c.Request.Context(), tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"connection_id": dc.ConnectionID,
		"status":        dc.Status,
	})
}

func (h *ConnectionHandler) List(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	list, err := h.svc.List(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *ConnectionHandler) GetByID(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	dc, err := h.svc.GetByID(c.Request.Context(), c.Param("connection_id"), tenantID)
	if err != nil {
		if err == service.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dc)
}

func (h *ConnectionHandler) Delete(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	if err := h.svc.Delete(c.Request.Context(), c.Param("connection_id"), tenantID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ConnectionHandler) Reconnect(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	dc, err := h.svc.Reconnect(c.Request.Context(), c.Param("connection_id"), tenantID)
	if err != nil {
		if err == service.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":         dc.Status,
		"reconnected_at": dc.UpdatedAt,
	})
}

func (h *ConnectionHandler) GetStatus(c *gin.Context) {
	tenantID := c.GetString(middleware.TenantIDKey)
	status, err := h.svc.GetStatus(c.Request.Context(), c.Param("connection_id"), tenantID)
	if err != nil {
		if err == service.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}
