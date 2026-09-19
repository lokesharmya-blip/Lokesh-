package routes

import (
	"time"

	"live-polling-backend/internal/config"
	"live-polling-backend/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter initializes Gin engine with CORS, logging, and endpoints.
func SetupRouter(cfg *config.Config, pollHandler *handlers.PollHandler, wsHandler *handlers.WSHandler) *gin.Engine {
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Configure CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSOOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	if len(cfg.CORSOOrigins) == 1 && cfg.CORSOOrigins[0] == "*" {
		corsConfig.AllowAllOrigins = true
		corsConfig.AllowOrigins = nil
	}
	router.Use(cors.New(corsConfig))

	// API routes
	api := router.Group("/api")
	{
		api.GET("/health", pollHandler.HealthCheck)
		api.GET("/polls", pollHandler.GetPolls)
		api.GET("/polls/:id", pollHandler.GetPoll)
		api.POST("/polls", pollHandler.CreatePoll)
		api.POST("/polls/:id/vote", pollHandler.Vote)
	}

	// Real-time WebSocket routes
	router.GET("/ws/polls", wsHandler.HandleWebSocket)
	router.GET("/ws/polls/:id", wsHandler.HandleWebSocket)

	return router
}
