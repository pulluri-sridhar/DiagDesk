package router

import (
	"github.com/diagdesk/device-gateway/internal/config"
	"github.com/diagdesk/device-gateway/internal/handler"
	"github.com/diagdesk/device-gateway/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func New(
	_ *config.Config,
	connHandler *handler.ConnectionHandler,
	worklistHandler *handler.WorklistHandler,
	msgHandler *handler.MessageHandler,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "device-gateway"})
	})

	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	v1 := r.Group("/v1")
	v1.Use(middleware.TenantAuth())
	{
		// Device connection management
		v1.POST("/device-connections", connHandler.Register)
		v1.GET("/device-connections", connHandler.List)
		v1.GET("/device-connections/:connection_id", connHandler.GetByID)
		v1.DELETE("/device-connections/:connection_id", connHandler.Delete)
		v1.PATCH("/device-connections/:connection_id/reconnect", connHandler.Reconnect)
		v1.GET("/device-connections/:connection_id/status", connHandler.GetStatus)

		// Worklist push to analyzer
		v1.POST("/worklist-download/:connection_id", worklistHandler.Push)

		// Raw message log (admin troubleshooting)
		v1.GET("/device-messages", msgHandler.ListMessages)

		// Unmatched result review + manual match
		v1.GET("/unmatched-results", msgHandler.ListUnmatched)
		v1.POST("/unmatched-results/:message_id/match", msgHandler.MatchResult)
	}

	return r
}
