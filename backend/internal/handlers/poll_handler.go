package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"live-polling-backend/internal/database"
	"live-polling-backend/internal/models"
	"live-polling-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type PollHandler struct {
	DB    *database.MongoDB
	Redis *redis.RedisClient
}

func NewPollHandler(db *database.MongoDB, rdb *redis.RedisClient) *PollHandler {
	return &PollHandler{
		DB:    db,
		Redis: rdb,
	}
}

// HealthCheck verifies MongoDB and Redis connectivity.
func (h *PollHandler) HealthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	mongoStatus := false
	if h.DB != nil && h.DB.Client != nil {
		if err := h.DB.Client.Ping(ctx, readpref.Primary()); err == nil {
			mongoStatus = true
		}
	}

	redisStatus := false
	if h.Redis != nil && h.Redis.Client != nil {
		if err := h.Redis.Client.Ping(ctx).Err(); err == nil {
			redisStatus = true
		}
	}

	overallStatus := "ok"
	if !mongoStatus || !redisStatus {
		overallStatus = "degraded"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    overallStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"services": gin.H{
			"mongodb": mongoStatus,
			"redis":   redisStatus,
		},
		"version": "1.0.0",
	})
}

// GetPolls returns all active polls from MongoDB.
func (h *PollHandler) GetPolls(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if h.DB == nil || h.DB.Database == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database is not connected"})
		return
	}

	coll := h.DB.GetCollection("polls")
	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := coll.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to fetch polls: %v", err)})
		return
	}
	defer cursor.Close(ctx)

	polls := make([]models.Poll, 0)
	for cursor.Next(ctx) {
		var poll models.Poll
		if err := cursor.Decode(&poll); err != nil {
			continue
		}
		polls = append(polls, poll)
	}

	c.JSON(http.StatusOK, gin.H{
		"polls": polls,
		"count": len(polls),
	})
}

// GetPoll returns a single poll by ID.
func (h *PollHandler) GetPoll(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if h.DB == nil || h.DB.Database == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database is not connected"})
		return
	}

	var poll models.Poll
	coll := h.DB.GetCollection("polls")
	err = coll.FindOne(ctx, bson.M{"_id": objID}).Decode(&poll)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	c.JSON(http.StatusOK, poll)
}

// CreatePoll handles creating a new poll.
func (h *PollHandler) CreatePoll(c *gin.Context) {
	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid request payload: %v", err)})
		return
	}

	if len(req.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least 2 options are required for a poll"})
		return
	}

	optionsList := make([]models.PollOption, 0, len(req.Options))
	for idx, optText := range req.Options {
		optionsList = append(optionsList, models.PollOption{
			ID:    fmt.Sprintf("opt_%d_%s", idx+1, uuid.New().String()[:6]),
			Text:  optText,
			Votes: 0,
		})
	}

	newPoll := models.Poll{
		ID:          primitive.NewObjectID(),
		Title:       req.Title,
		Description: req.Description,
		Options:     optionsList,
		TotalVotes:  0,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
		IsActive:    true,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if h.DB == nil || h.DB.Database == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database is not connected"})
		return
	}

	coll := h.DB.GetCollection("polls")
	_, err := coll.InsertOne(ctx, newPoll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to save poll: %v", err)})
		return
	}

	// Broadcast poll creation via Redis
	if h.Redis != nil && h.Redis.Client != nil {
		_ = h.Redis.PublishVoteEvent(context.Background(), models.VoteEvent{
			Type:       "POLL_CREATED",
			PollID:     newPoll.ID.Hex(),
			TotalVotes: 0,
			Options:    newPoll.Options,
			Timestamp:  time.Now().UTC(),
		})
	}

	c.JSON(http.StatusCreated, newPoll)
}

// Vote records a vote for a poll option and broadcasts via Redis.
func (h *PollHandler) Vote(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	var req models.VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid vote payload: %v", err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if h.DB == nil || h.DB.Database == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database is not connected"})
		return
	}

	coll := h.DB.GetCollection("polls")

	// Update atomic vote count in MongoDB using arrayFilters
	filter := bson.M{
		"_id":        objID,
		"is_active":  true,
		"options.id": req.OptionID,
	}
	update := bson.M{
		"$inc": bson.M{
			"total_votes":         1,
			"options.$[elem].votes": 1,
		},
		"$set": bson.M{
			"updated_at": time.Now().UTC(),
		},
	}
	arrayFilters := options.ArrayFilters{
		Filters: []interface{}{
			bson.M{"elem.id": req.OptionID},
		},
	}
	opts := options.FindOneAndUpdate().
		SetArrayFilters(arrayFilters).
		SetReturnDocument(options.After)

	var updatedPoll models.Poll
	err = coll.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updatedPoll)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll or option not found, or poll is inactive"})
		return
	}

	// Publish real-time vote update event to Redis Pub/Sub
	if h.Redis != nil && h.Redis.Client != nil {
		event := models.VoteEvent{
			Type:       "VOTE_CAST",
			PollID:     updatedPoll.ID.Hex(),
			OptionID:   req.OptionID,
			TotalVotes: updatedPoll.TotalVotes,
			Options:    updatedPoll.Options,
			Timestamp:  time.Now().UTC(),
		}
		if pubErr := h.Redis.PublishVoteEvent(context.Background(), event); pubErr != nil {
			fmt.Printf("[Warning] Failed to publish vote to Redis: %v\n", pubErr)
		}
	}

	c.JSON(http.StatusOK, updatedPoll)
}
