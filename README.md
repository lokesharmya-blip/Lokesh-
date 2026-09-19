# Live Polling Web App

A modern, real-time live polling web application built with **React**, **TypeScript**, **Go (Gin)**, **MongoDB**, and **Redis**.

---

## 🏛 Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │          React + TypeScript Frontend    │
                        │               (Port 3000)               │
                        └────────────▲───────────────────▲────────┘
                                     │                   │
                        REST API (HTTP)            WebSocket (WS)
                                     │                   │
                        ┌────────────▼───────────────────▼────────┐
                        │              Go + Gin Backend           │
                        │               (Port 8080)               │
                        └────────────┬───────────────────┬────────┘
                                     │                   │
                     Atomic Persistence           Pub/Sub Broker
                                     │                   │
                        ┌────────────▼─────┐       ┌─────▼────────┐
                        │     MongoDB      │       │    Redis     │
                        │  (Port 27017)    │       │ (Port 6379)  │
                        └──────────────────┘       └──────────────┘
```

- **Frontend (`/frontend`)**: React 19, TypeScript, Vite, and Tailwind CSS. Connects to the Go backend via typed REST client (`/src/services/api.ts`) and WebSocket client (`/src/services/websocket.ts`).
- **Backend (`/backend`)**: Go with the Gin web framework. Exposes REST endpoints for poll management and Gorilla WebSockets for real-time streaming.
- **Database**: MongoDB stores poll documents and tracks vote tallies atomically using MongoDB's `$inc` and `arrayFilters`.
- **Realtime**: Redis Pub/Sub brokers vote events across distributed backend nodes and forwards them over WebSockets to connected browsers.

---

## 📁 Project Structure

```text
.
├── backend/                        # Go + Gin Backend
│   ├── cmd/
│   │   └── server/
│   │       └── main.go             # Application entrypoint
│   ├── internal/
│   │   ├── config/                 # Environment configuration loader
│   │   ├── database/               # MongoDB connection client
│   │   ├── handlers/               # HTTP & WebSocket handlers
│   │   │   ├── poll_handler.go     # CRUD & voting handlers
│   │   │   └── ws_handler.go       # Gorilla WebSocket & Redis bridge
│   │   ├── models/                 # Poll, option, and event data structures
│   │   ├── redis/                  # Redis connection and Pub/Sub manager
│   │   └── routes/                 # Gin routing & CORS middleware
│   ├── .env.example                # Backend environment template
│   ├── Dockerfile                  # Multi-stage Go build
│   └── go.mod                      # Go module dependencies
│
├── frontend/                       # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── BackendStatusBanner.tsx # Live connection diagnostics
│   │   │   ├── CreatePollModal.tsx     # Poll creation dialog
│   │   │   ├── Navbar.tsx              # Navigation & service health pills
│   │   │   ├── PollActiveView.tsx      # Real-time voting & live stream
│   │   │   └── PollCard.tsx            # Poll summary card
│   │   ├── services/
│   │   │   ├── api.ts              # Fetch client for Go Gin REST API
│   │   │   └── websocket.ts        # WebSocket client for Redis live events
│   │   ├── types/
│   │   │   └── poll.ts             # TypeScript interfaces
│   │   ├── App.tsx                 # Main application view
│   │   ├── main.tsx                # React root mount
│   │   └── index.css               # Global Tailwind styling
│   ├── .env.example                # Frontend environment template
│   ├── Dockerfile                  # Production container build
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   └── vite.config.ts              # Vite configuration
│
├── docker-compose.yml              # Complete 4-tier stack orchestration
├── .env.example                    # Root environment variables
└── README.md                       # Setup & architecture guide
```

---

## 🚀 Quick Start with Docker Compose

The fastest way to spin up the entire application (MongoDB, Redis, Go backend, and React frontend) is with Docker Compose:

```bash
# Clone or enter the project directory
docker compose up --build
```

Once running:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Go Gin API**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

---

## 🛠 Manual Local Development Setup

### 1. Prerequisites
- **Go**: version 1.21 or later
- **Node.js**: version 18 or later (npm 9+)
- **MongoDB**: running locally on port 27017
- **Redis**: running locally on port 6379

> *Tip: You can quickly start only MongoDB and Redis using Docker:*
> ```bash
> docker run -d -p 27017:27017 --name mongo mongo:7.0
> docker run -d -p 6379:6379 --name redis redis:7.2-alpine
> ```

---

### 2. Configure & Run Backend (Go + Gin)

```bash
cd backend

# Copy environment template
cp .env.example .env

# Download Go dependencies
go mod tidy

# Start the server
go run cmd/server/main.go
```

The Go server will start on port `8080`. Test it with:
```bash
curl http://localhost:8080/api/health
```

Output:
```json
{
  "status": "ok",
  "services": {
    "mongodb": true,
    "redis": true
  },
  "timestamp": "2026-09-19T10:30:00Z",
  "version": "1.0.0"
}
```

---

### 3. Configure & Run Frontend (React + TypeScript)

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will start at [http://localhost:3000](http://localhost:3000) and automatically connect to `http://localhost:8080`.

---

## ⚙️ Environment Variables

### Backend (`/backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the Go Gin HTTP & WebSocket server |
| `GIN_MODE` | `debug` | Gin operational mode (`debug` or `release`) |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection URI string |
| `MONGO_DB_NAME` | `live_polling` | MongoDB database name |
| `REDIS_ADDR` | `localhost:6379` | Redis host:port address |
| `REDIS_PASSWORD` | `""` | Redis authentication password (if any) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins for browser requests |

### Frontend (`/frontend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL of the Go Gin REST API |
| `VITE_WS_BASE_URL` | `ws://localhost:8080` | Base WebSocket URL for real-time Redis streams |

---

## 🔌 API & WebSocket Reference

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check (verifies MongoDB & Redis) |
| `GET` | `/api/polls` | Fetches all active polls sorted by creation date |
| `GET` | `/api/polls/:id` | Fetches details and vote tallies for a single poll |
| `POST` | `/api/polls` | Creates a new poll with minimum 2 options |
| `POST` | `/api/polls/:id/vote` | Casts a vote on an option, persists to MongoDB, broadcasts to Redis |

#### Example: Create Poll (`POST /api/polls`)
```json
{
  "title": "Which database do you prefer for real-time apps?",
  "description": "Vote for your preferred storage engine.",
  "options": ["MongoDB", "PostgreSQL", "Redis", "Cassandra"]
}
```

#### Example: Vote on Poll (`POST /api/polls/:id/vote`)
```json
{
  "option_id": "opt_1_abc123",
  "voter_id": "voter_client_987"
}
```

### WebSocket Streaming

- **Endpoint**: `GET /ws/polls/:id` (or `GET /ws/polls` for all polls)
- **Protocol**: WebSocket
- **Realtime Payload**:
```json
{
  "type": "VOTE_CAST",
  "poll_id": "66e9f2a4...",
  "option_id": "opt_1_abc123",
  "total_votes": 42,
  "options": [
    { "id": "opt_1_abc123", "text": "MongoDB", "votes": 25 },
    { "id": "opt_2_def456", "text": "PostgreSQL", "votes": 17 }
  ],
  "timestamp": "2026-09-19T10:30:15Z"
}
```

---

## 🛡 Verification & Production Build

- **Frontend Type Check**: `cd frontend && npm run lint`
- **Frontend Build**: `cd frontend && npm run build`
- **Backend Binary**: `cd backend && go build -o server ./cmd/server`
