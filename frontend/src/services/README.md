# API Services

This directory contains API client services for communicating with the Smart AIS MVP backend.

## Structure

- **api.ts** - REST API client for HTTP requests
- **websocket.ts** - WebSocket client for real-time updates
- **index.ts** - Central export point for all services

## Usage

Services are designed to be used throughout the application to interact with the backend:

```typescript
import { apiClient, websocketClient } from '@/services';

// Fetch vessels
const vessels = await apiClient.getVessels({ limit: 100 });

// Connect to WebSocket for real-time updates
websocketClient.connect();
websocketClient.on('vesselUpdate', (data) => {
  console.log('Vessel updated:', data);
});
```

## Configuration

API and WebSocket URLs are configured via environment variables:
- `VITE_API_URL` - Backend REST API URL (default: http://localhost:3000)
- `VITE_WS_URL` - Backend WebSocket URL (default: ws://localhost:3000)

These can be set in `.env` files:
- `.env.development` - Development environment
- `.env.production` - Production environment
