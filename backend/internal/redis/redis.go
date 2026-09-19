package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"live-polling-backend/internal/models"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
}

// ConnectRedis initializes connection to Redis.
func ConnectRedis(addr string, password string, db int) (*RedisClient, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Printf("[Redis Warning] Ping failed (%v). Redis might still be starting or unreachable at %s", err, addr)
		return &RedisClient{Client: rdb}, err
	}

	log.Printf("[Redis] Successfully connected to Redis at: %s", addr)
	return &RedisClient{Client: rdb}, nil
}

// ChannelName returns the pubsub channel for a specific poll or all polls.
func ChannelName(pollID string) string {
	if pollID == "" || pollID == "all" {
		return "poll:events:all"
	}
	return fmt.Sprintf("poll:events:%s", pollID)
}

// PublishVoteEvent publishes a real-time vote cast event to Redis Pub/Sub.
func (r *RedisClient) PublishVoteEvent(ctx context.Context, event models.VoteEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal vote event: %w", err)
	}

	// Publish to specific poll channel and global channel
	specificChannel := ChannelName(event.PollID)
	if err := r.Client.Publish(ctx, specificChannel, data).Err(); err != nil {
		return fmt.Errorf("failed to publish to %s: %w", specificChannel, err)
	}

	_ = r.Client.Publish(ctx, ChannelName("all"), data)
	return nil
}

// SubscribePoll subscribes to a Redis channel for real-time poll updates.
func (r *RedisClient) SubscribePoll(ctx context.Context, pollID string) *redis.PubSub {
	channel := ChannelName(pollID)
	return r.Client.Subscribe(ctx, channel)
}
