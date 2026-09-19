package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	GinMode      string
	MongoURI     string
	MongoDBName  string
	RedisAddr    string
	RedisPass    string
	RedisDB      int
	CORSOOrigins []string
}

// LoadConfig loads environment configurations with fallback defaults.
func LoadConfig() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	mongoDBName := os.Getenv("MONGO_DB_NAME")
	if mongoDBName == "" {
		mongoDBName = "live_polling"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisPass := os.Getenv("REDIS_PASSWORD")

	corsEnv := os.Getenv("CORS_ORIGINS")
	var corsOrigins []string
	if corsEnv != "" {
		corsOrigins = strings.Split(corsEnv, ",")
	} else {
		corsOrigins = []string{"*"}
	}

	return &Config{
		Port:         port,
		GinMode:      ginMode,
		MongoURI:     mongoURI,
		MongoDBName:  mongoDBName,
		RedisAddr:    redisAddr,
		RedisPass:    redisPass,
		RedisDB:      0,
		CORSOOrigins: corsOrigins,
	}
}
