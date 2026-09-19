package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"live-polling-backend/internal/models"
	"live-polling-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins in development and preview environments
		return true
	},
}

type WSHandler struct {
	Redis *redis.RedisClient
}

func NewWSHandler(rdb *redis.RedisClient) *WSHandler {
	return &WSHandler{Redis: rdb}
}

// HandleWebSocket upgrades connection and streams real-time Redis Pub/Sub events.
func (h *WSHandler) HandleWebSocket(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		pollID = "all"
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WebSocket Error] Upgrade failed: %v", err)
		return
	}
	defer ws.Close()

	// Send initial connection ACK
	ack := gin.H{
		"type":    "CONNECTED",
		"poll_id": pollID,
		"time":    time.Now().UTC().Format(time.RFC3339),
		"message": "Connected to real-time poll live stream via Redis",
	}
	_ = ws.WriteJSON(ack)

	if h.Redis == nil || h.Redis.Client == nil {
		_ = ws.WriteJSON(gin.H{
			"type":    "WARNING",
			"message": "Redis is not connected on server. Live streaming is waiting for Redis.",
		})
		// Keep connection alive with pings
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pubsub := h.Redis.SubscribePoll(ctx, pollID)
	defer pubsub.Close()

	ch := pubsub.Channel()

	// Channel to signal client disconnection
	done := make(chan struct{})

	// Goroutine to read from WebSocket (detecting disconnects)
	go func() {
		defer close(done)
		for {
			_, _, err := ws.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	// Heartbeat ticker
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var event models.VoteEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				// Forward raw string if JSON parsing fails
				_ = ws.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			} else {
				_ = ws.WriteJSON(event)
			}
		case <-ticker.C:
			if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
