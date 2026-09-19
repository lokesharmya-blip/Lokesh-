package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PollOption represents an individual choice in a poll.
type PollOption struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Votes int64  `bson:"votes" json:"votes"`
}

// Poll represents a live voting poll stored in MongoDB.
type Poll struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description,omitempty" json:"description"`
	Options     []PollOption       `bson:"options" json:"options"`
	TotalVotes  int64              `bson:"total_votes" json:"total_votes"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
}

// CreatePollRequest payload for creating a new poll.
type CreatePollRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	Options     []string `json:"options" binding:"required,min=2"`
}

// VoteRequest payload when a user casts a vote.
type VoteRequest struct {
	OptionID string `json:"option_id" binding:"required"`
	VoterID  string `json:"voter_id"`
}

// VoteEvent represents the real-time event broadcasted via Redis and WebSockets.
type VoteEvent struct {
	Type       string       `json:"type"` // e.g., "VOTE_CAST"
	PollID     string       `json:"poll_id"`
	OptionID   string       `json:"option_id"`
	TotalVotes int64        `json:"total_votes"`
	Options    []PollOption `json:"options"`
	Timestamp  time.Time    `json:"timestamp"`
}
