# AISight

Track vessels in real-time using live AIS data on an interactive map.

## Preview
| ![Screen 1](./screenshot/p1.webp) | ![Screen 2](./screenshot/p2.webp)
|--|--|
| ![Screen 3](./screenshot/p3.webp) | ![Screen 4](./screenshot/p4.webp)

## Features

- 🗺️ **Real-time Tracking** - live AIS streams
- 🤖 **AI Enhance** - Support LLM provißder to enhance AI analysis
- 🌍 **Interactive Map** - Leaflet-based visualization with vessel markers and tracks
- 🔍 **Search & Filter** - Find vessels by name or MMSI, filter by type and location
- 📊 **Historical Tracks** - View vessel movement history
- 🔄 **Live Updates** - WebSocket-powered updates without page refresh
- �  **Time-Series Storage** - TimescaleDB for efficient historical queries
- ⚡ **Fast Caching** - Redis for quick access to recent positions

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd smart-ais-mvp

# Set up environment
cp .env.example .env
# Edit .env and add your AISStream API key

# Install dependencies
npm run install:all

# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

Get your free API key at [https://aisstream.io](https://aisstream.io)

Access the app at [http://localhost:5173](http://localhost:5173)

## Project Structure

```
smart-ais-mvp/
├── backend/                 # Node.js/Express backend service
│   ├── src/
│   │   ├── api/            # REST API routes and middleware
│   │   ├── db/             # Database connection
│   │   ├── repositories/   # Data access layer
│   │   ├── services/       # Business logic (AISStream, Cache, Pipeline, WebSocket)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utilities (logger, errors)
│   │   └── server.ts       # Application entry point
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components (Map, VesselList, Search, etc.)
│   │   ├── hooks/          # Custom React hooks (useVesselTracking)
│   │   ├── utils/          # Utilities (GeoJSON conversion)
│   │   ├── config/         # Configuration
│   │   └── types/          # TypeScript type definitions
│   └── package.json
├── database/
│   └── init/               # Database initialization scripts
│       ├── 01-create-schema.sql
│       └── 02-create-views.sql
├── .env.example            # Environment variables template
└── package.json            # Root package.json for monorepo scripts
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with TimescaleDB extension
- Redis 7+
- AISStream API key ([free at aisstream.io](https://aisstream.io))

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-ais-mvp
   ```

2. **Install PostgreSQL with TimescaleDB**
   
   macOS:
   ```bash
   brew install timescaledb
   createdb ais_db
   psql ais_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
   ```
   
   Ubuntu/Debian:
   ```bash
   sudo apt-get install postgresql-14 postgresql-14-timescaledb
   createdb ais_db
   psql ais_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
   ```

3. **Install and start Redis**
   
   macOS: `brew install redis && brew services start redis`
   
   Ubuntu/Debian: `sudo apt-get install redis-server && sudo systemctl start redis`

4. **Set up backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   
   Edit `backend/.env` with your settings:
   ```bash
   AISSTREAM_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://ais_user:ais_password@localhost:5432/ais_db
   REDIS_URL=redis://localhost:6379
   ```
   
   Initialize database and start:
   ```bash
   psql ais_db < ../database/init/01-create-schema.sql
   psql ais_db < ../database/init/02-create-views.sql
   npm run dev
   ```

5. **Set up frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Edit 'frontend/.env' with your settings:
   ```bash
   # AI/LLM Configuration
    VITE_LLM_API_BASE_URL=
    VITE_LLM_MODEL=
    VITE_LLM_API_KEY=
  ```

6. **Open the app**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend `backend/.env`

```bash
# Required
AISSTREAM_API_KEY=your_api_key_here
DATABASE_URL=postgresql://ais_user:ais_password@localhost:5432/ais_db
REDIS_URL=redis://localhost:6379

# Optional
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

### Frontend `frontend/.env`

```bash
# Defaults work for local development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## API Documentation

Base URL: `http://localhost:3000/api`

### Endpoints

#### GET `/api/vessels`
List vessels with optional filters.

**Query Parameters:**
- `mmsi`, `name`, `type` - Filter by vessel attributes
- `minLat`, `maxLat`, `minLon`, `maxLon` - Bounding box
- `speedMin`, `speedMax` - Speed range in knots
- `limit`, `offset` - Pagination

**Example:**
```bash
curl "http://localhost:3000/api/vessels?type=70&limit=10"
```

**Response:**
```json
{
  "vessels": [
    {
      "mmsi": "367719770",
      "name": "OCEAN EXPLORER",
      "vessel_type": 70,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "sog": 12.5,
      "cog": 285.0,
      "timestamp": "2025-12-01T10:30:00Z"
    }
  ],
  "count": 10,
  "timestamp": "2025-12-01T10:30:15Z"
}
```

#### GET `/api/vessels/:mmsi`
Get vessel details by MMSI.

**Example:**
```bash
curl "http://localhost:3000/api/vessels/367719770"
```

**Response:**
```json
{
  "vessel": {
    "mmsi": "367719770",
    "name": "OCEAN EXPLORER",
    "vessel_type": 70,
    "imo_number": 1234567,
    "call_sign": "WDD1234",
    "dimension_a": 50,
    "dimension_b": 50,
    "dimension_c": 10,
    "dimension_d": 10
  },
  "position": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "sog": 12.5,
    "cog": 285.0,
    "timestamp": "2025-12-01T10:30:00Z"
  },
  "timestamp": "2025-12-01T10:30:15Z"
}
```

#### GET `/api/vessels/:mmsi/track`
Get vessel position history.

**Query Parameters:**
- `startTime`, `endTime` - ISO 8601 timestamps (defaults to last 24 hours)

**Example:**
```bash
curl "http://localhost:3000/api/vessels/367719770/track?startTime=2025-12-01T00:00:00Z"
```

**Response:**
```json
{
  "mmsi": "367719770",
  "startTime": "2025-12-01T00:00:00Z",
  "endTime": "2025-12-01T10:30:00Z",
  "track": [
    {
      "timestamp": "2025-12-01T00:00:00Z",
      "latitude": 37.7700,
      "longitude": -122.4200,
      "sog": 10.0,
      "cog": 280.0
    }
  ],
  "count": 150,
  "timestamp": "2025-12-01T10:30:15Z"
}
```

#### GET `/api/search`
Search vessels by name or MMSI.

**Query Parameters:**
- `q` - Search query (required)
- `limit` - Max results

**Example:**
```bash
curl "http://localhost:3000/api/search?q=OCEAN&limit=10"
```

**Response:**
```json
{
  "query": "OCEAN",
  "results": [
    {
      "mmsi": "367719770",
      "name": "OCEAN EXPLORER",
      "vessel_type": 70,
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  ],
  "count": 10,
  "timestamp": "2025-12-01T10:30:15Z"
}
```

#### GET `/api/health`
Health check endpoint.

**Example:**
```bash
curl "http://localhost:3000/api/health"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:15Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### WebSocket Events

Connect to `ws://localhost:3000`

**Events:**
- `vesselUpdate` - Real-time position updates
- `connect` / `disconnect` - Connection status

**Example:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('vesselUpdate', (data) => {
  console.log('Vessel update:', data);
  // data contains: { mmsi, latitude, longitude, sog, cog, timestamp }
});
```

### Error Responses

Errors return a JSON object with `code`, `message`, and `timestamp`.

## Development

### Root Scripts

```bash
npm run install:all      # Install dependencies
npm run dev:backend      # Start backend
npm run dev:frontend     # Start frontend
npm run build:all        # Build both
npm run test:all         # Run all tests
npm run lint:all         # Lint code
```

### Backend / Frontend Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint code
```

## Testing

Run tests from root or individual directories:

```bash
npm run test:all              # All tests
cd backend && npm test        # Backend only
cd frontend && npm test       # Frontend only
npm test -- --coverage        # With coverage
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Map Component│  │ Vessel List  │  │ Search/Filter│      │
│  │  (Leaflet)   │  │  Component   │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↕                  ↕                  ↕              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebSocket Client (Socket.io)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ WebSocket    │  │ REST API     │  │ AISStream    │      │
│  │ Server       │  │ Endpoints    │  │ Manager      │      │
│  │ (Socket.io)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↕                  ↕                  ↕              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Pipeline & Business Logic                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis Cache  │  │ AISStream    │      │
│  │ (TimescaleDB)│  │              │  │ WebSocket    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:** React 18, TypeScript, Leaflet, Socket.io, TailwindCSS, Vite

**Backend:** Node.js 18+, Express, Socket.io, TypeScript, Jest

**Data:** PostgreSQL with TimescaleDB, Redis

### Key Components

- **AISStreamManager** - Manages WebSocket connection to AISStream API
- **DataPipeline** - Processes and stores incoming AIS messages
- **VesselRepository** - Data access layer
- **CacheService** - Redis caching for recent data
- **WebSocketServer** - Broadcasts updates to clients

## Troubleshooting

**Cannot connect to AISStream:**
- Check your API key in `.env`
- Verify internet connection

**Database connection errors:**
- Make sure PostgreSQL is running
- Verify DATABASE_URL in `.env`

**Redis connection errors:**
- Make sure Redis is running
- Check REDIS_URL in `.env`

**Frontend can't reach backend:**
- Check backend health: `curl http://localhost:3000/api/health`
- Verify VITE_API_URL in `frontend/.env`

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

## Acknowledgments
- [Kiro](https://kiro.dev) for vibe-coding
- [AISStream](https://aisstream.io) for real-time AIS data
- [Leaflet](https://leafletjs.com) for map visualization
- [TimescaleDB](https://www.timescale.com) for time-series storage
- [OpenMeteo](https://open-meteo.com/) for weather data