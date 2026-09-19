package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type MongoDB struct {
	Client   *mongo.Client
	Database *mongo.Database
}

// ConnectMongo initializes the MongoDB client with timeout and connection testing.
func ConnectMongo(uri string, dbName string) (*MongoDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to create mongo client: %w", err)
	}

	// Ping database to verify connection
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Printf("[MongoDB Warning] Ping failed (%v). MongoDB might still be starting or unreachable at %s", err, uri)
		// Return client instance even if ping fails initially so server can start with health warning
		return &MongoDB{
			Client:   client,
			Database: client.Database(dbName),
		}, err
	}

	log.Printf("[MongoDB] Successfully connected to database: %s", dbName)
	return &MongoDB{
		Client:   client,
		Database: client.Database(dbName),
	}, nil
}

// GetCollection returns a MongoDB collection pointer.
func (m *MongoDB) GetCollection(name string) *mongo.Collection {
	return m.Database.Collection(name)
}
