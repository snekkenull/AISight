# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Create monorepo structure with backend and frontend directories
  - Initialize TypeScript configuration for both projects
  - Set up ESLint and Prettier for code quality
  - Create .env.example files with required environment variables
  - Initialize Git repository with .gitignore
  - _Requirements: 7.1, 7.5_

- [x] 2. Set up Docker infrastructure
  - Create Dockerfile for backend service with multi-stage build
  - Create Dockerfile for frontend service with Nginx
  - Create docker-compose.yml orchestrating all services (backend, frontend, PostgreSQL, Redis)
  - Create database initialization scripts for schema setup
  - Add health check configurations for all services
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement database schema and repository layer
  - Create PostgreSQL schema with vessels and position_reports tables
  - Set up TimescaleDB hypertable for position_reports
  - Create spatial indexes for geographic queries
  - Implement VesselRepository with CRUD operations
  - Implement batch insert method for position reports
  - Implement query methods with filtering (MMSI, name, type, bounding box)
  - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.2, 4.3_

- [ ]* 3.1 Write property test for duplicate position prevention
  - **Property 11: Duplicate position prevention**
  - **Validates: Requirements 3.5**

- [ ]* 3.2 Write property test for vessel metadata upsert
  - **Property 10: Vessel metadata upsert by MMSI**
  - **Validates: Requirements 3.2**

- [ ]* 3.3 Write property test for bounding box filter correctness
  - **Property 14: Bounding box filter correctness**
  - **Validates: Requirements 4.3**

- [x] 4. Implement Redis cache service
  - Create CacheService class with Redis client initialization
  - Implement setVesselPosition and getVesselPosition methods
  - Implement setVesselMetadata and getVesselMetadata methods
  - Implement getActiveVesselCount method
  - Implement getVesselsInBounds using Redis geospatial commands
  - Configure TTL values for different data types
  - _Requirements: 3.4_

- [ ]* 4.1 Write unit tests for cache operations
  - Test cache set/get operations
  - Test TTL expiration
  - Test geospatial queries

- [x] 5. Implement AISStream WebSocket manager
  - Create AISStreamManager class with WebSocket connection handling
  - Implement connect method with authentication
  - Implement message parsing for Position Report messages
  - Implement message parsing for Ship Static Data messages
  - Implement reconnection logic with exponential backoff (up to 5 attempts)
  - Implement event emitters for position, staticData, and error events
  - Add connection statistics tracking
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 5.1 Write property test for Position Report parsing completeness
  - **Property 7: Position Report parsing completeness**
  - **Validates: Requirements 2.4**

- [ ]* 5.2 Write property test for Ship Static Data parsing completeness
  - **Property 8: Ship Static Data parsing completeness**
  - **Validates: Requirements 2.5**

- [ ]* 5.3 Write property test for authentication message timing
  - **Property 5: Authentication message timing**
  - **Validates: Requirements 2.2**

- [ ]* 5.4 Write property test for reconnection with exponential backoff
  - **Property 6: Reconnection with exponential backoff**
  - **Validates: Requirements 2.3**

- [ ]* 5.5 Write unit tests for AISStream manager
  - Test connection establishment
  - Test message handling
  - Test error scenarios

- [x] 6. Implement data pipeline
  - Create DataPipeline class with batch queue
  - Implement processPosition method with validation
  - Implement processStaticData method with validation
  - Implement batch processing with configurable batch size and interval
  - Integrate with VesselRepository for database writes
  - Integrate with CacheService for cache updates
  - Add error handling for invalid data
  - _Requirements: 3.1, 3.2, 10.3_

- [ ]* 6.1 Write property test for position data storage completeness
  - **Property 9: Position data storage completeness**
  - **Validates: Requirements 3.1**

- [ ]* 6.2 Write property test for invalid message handling
  - **Property 25: Invalid message handling**
  - **Validates: Requirements 10.3**

- [ ]* 6.3 Write unit tests for data pipeline
  - Test batch processing
  - Test validation logic
  - Test error handling

- [x] 7. Implement backend WebSocket server
  - Create WebSocket server using Socket.io
  - Implement connection handling and client tracking
  - Implement broadcastUpdate method for vessel updates
  - Implement regional broadcast for geographic filtering
  - Add connection/disconnection event handlers
  - Integrate with DataPipeline to receive vessel updates
  - _Requirements: 9.1, 9.2_

- [ ]* 7.1 Write integration tests for WebSocket server
  - Test client connection/disconnection
  - Test message broadcasting
  - Test regional subscriptions

- [x] 8. Implement REST API endpoints
  - Create Express application with TypeScript
  - Implement GET /api/vessels endpoint with query parameters
  - Implement GET /api/vessels/:mmsi endpoint
  - Implement GET /api/vessels/:mmsi/track endpoint with time range
  - Implement GET /api/search endpoint
  - Implement GET /api/health endpoint
  - Add request validation middleware
  - Add error handling middleware
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.4_

- [ ]* 8.1 Write property test for search result correctness
  - **Property 12: Search result correctness**
  - **Validates: Requirements 4.1**

- [ ]* 8.2 Write property test for vessel type filter correctness
  - **Property 13: Vessel type filter correctness**
  - **Validates: Requirements 4.2**

- [ ]* 8.3 Write property test for search result field completeness
  - **Property 15: Search result field completeness**
  - **Validates: Requirements 4.4**

- [ ]* 8.4 Write property test for track time range update correctness
  - **Property 19: Track time range update correctness**
  - **Validates: Requirements 5.4**

- [ ]* 8.5 Write integration tests for REST API
  - Test all endpoints with various query parameters
  - Test error responses
  - Test validation

- [x] 9. Implement error handling and logging
  - Create structured logger with Winston
  - Implement error logging with stack traces
  - Add error handling for AISStream errors
  - Add error handling for database errors
  - Add error handling for unexpected errors
  - Create error response format
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ]* 9.1 Write property test for AISStream error logging
  - **Property 23: AISStream error logging**
  - **Validates: Requirements 10.1**

- [ ]* 9.2 Write property test for database failure handling
  - **Property 24: Database failure handling**
  - **Validates: Requirements 10.2**

- [ ]* 9.3 Write property test for unexpected error logging
  - **Property 26: Unexpected error logging**
  - **Validates: Requirements 10.5**

- [x] 10. Wire up backend services
  - Create main server.ts file
  - Initialize database connection with connection pooling
  - Initialize Redis connection
  - Initialize AISStreamManager with API key
  - Initialize DataPipeline and connect to AISStreamManager events
  - Initialize WebSocket server
  - Start Express server
  - Add graceful shutdown handling
  - _Requirements: 2.1, 2.2, 6.4, 6.5_

- [ ]* 10.1 Write integration tests for backend startup
  - Test service initialization
  - Test graceful shutdown
  - Test health check endpoint

- [x] 11. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Set up frontend project structure
  - Initialize React project with Vite and TypeScript
  - Install dependencies (Leaflet, Socket.io-client, TailwindCSS)
  - Set up TailwindCSS configuration
  - Create component directory structure
  - Create hooks directory for custom hooks
  - Create services directory for API clients
  - _Requirements: 7.2, 7.4_

- [x] 13. Implement GeoJSON utilities
  - Create utility functions to convert vessel positions to GeoJSON Point
  - Create utility functions to convert vessel tracks to GeoJSON LineString
  - Add GeoJSON validation functions
  - _Requirements: 1.4, 5.2_

- [ ]* 13.1 Write property test for GeoJSON format compliance for positions
  - **Property 3: GeoJSON format compliance for positions**
  - **Validates: Requirements 1.4**

- [ ]* 13.2 Write property test for GeoJSON LineString format for tracks
  - **Property 17: GeoJSON LineString format for tracks**
  - **Validates: Requirements 5.2**

- [x] 14. Implement WebSocket client hook
  - Create useVesselTracking custom hook
  - Implement Socket.io connection with reconnection logic
  - Implement vessel update event handling
  - Implement connection status tracking
  - Add error handling for connection failures
  - _Requirements: 9.1, 9.3, 9.4, 10.4_

- [ ]* 14.1 Write property test for connection status indicator accuracy
  - **Property 21: Connection status indicator accuracy**
  - **Validates: Requirements 9.3**

- [ ]* 14.2 Write property test for disconnection status and reconnection
  - **Property 22: Disconnection status and reconnection**
  - **Validates: Requirements 9.4**

- [ ]* 14.3 Write unit tests for WebSocket client hook
  - Test connection establishment
  - Test reconnection logic
  - Test event handling

- [x] 15. Implement Map component
  - Create MapComponent with Leaflet integration
  - Implement vessel marker rendering with GeoJSON
  - Implement vessel type-based marker icons
  - Implement vessel popup with MMSI, name, speed, course, timestamp
  - Implement vessel track rendering as GeoJSON LineString
  - Add map controls (zoom, pan)
  - Integrate with useVesselTracking hook for real-time updates
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 9.2_

- [ ]* 15.1 Write property test for vessel popup completeness
  - **Property 2: Vessel popup completeness**
  - **Validates: Requirements 1.3**

- [ ]* 15.2 Write property test for vessel type visual distinction
  - **Property 4: Vessel type visual distinction**
  - **Validates: Requirements 1.5**

- [ ]* 15.3 Write property test for vessel track display
  - **Property 16: Vessel track display**
  - **Validates: Requirements 5.1**

- [ ]* 15.4 Write property test for track timestamp annotations
  - **Property 18: Track timestamp annotations**
  - **Validates: Requirements 5.3**

- [ ]* 15.5 Write property test for real-time map updates
  - **Property 20: Real-time map updates**
  - **Validates: Requirements 9.2**

- [x] 16. Implement Search and Filter component
  - Create SearchFilter component with input field
  - Implement vessel name/MMSI search
  - Implement vessel type filter dropdown
  - Implement bounding box selection on map
  - Add debouncing for search input
  - Display "no results" message when appropriate
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ]* 16.1 Write unit tests for search and filter
  - Test search input handling
  - Test filter application
  - Test debouncing

- [x] 17. Implement Vessel List component
  - Create VesselList component displaying active vessels
  - Show vessel MMSI, name, position, and last update time
  - Implement sorting by name, MMSI, or update time
  - Add click handler to focus vessel on map
  - Integrate with search/filter results
  - _Requirements: 4.4_

- [ ]* 17.1 Write unit tests for vessel list
  - Test rendering
  - Test sorting
  - Test click handling

- [x] 18. Implement connection status indicator
  - Create ConnectionStatus component
  - Display "Connected" when WebSocket is active
  - Display "Disconnected" when WebSocket is lost
  - Add visual indicator (green/red dot)
  - _Requirements: 9.3, 9.4_

- [x] 19. Implement error display component
  - Create ErrorDisplay component
  - Display user-friendly error messages
  - Show troubleshooting steps for connection errors
  - Add dismiss functionality
  - _Requirements: 10.2, 10.4_

- [x] 20. Wire up frontend application
  - Create main App component
  - Integrate MapComponent, VesselList, SearchFilter, ConnectionStatus
  - Set up routing if needed
  - Add loading states
  - Add error boundaries
  - Configure API and WebSocket URLs from environment variables
  - _Requirements: 1.1, 7.5_

- [ ]* 20.1 Write end-to-end tests with Playwright
  - Test map rendering and interaction
  - Test real-time vessel updates
  - Test search and filter functionality
  - Test vessel track visualization

- [x] 21. Checkpoint - Ensure frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Build and optimize frontend
  - Configure Vite build for production
  - Optimize bundle size
  - Add source maps for debugging
  - Create Nginx configuration for serving static files
  - _Requirements: 6.1, 6.2_

- [x] 23. Create deployment documentation
  - Write README.md with project overview
  - Document environment variables
  - Document Docker deployment steps
  - Document development setup
  - Add API documentation
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 24. Final integration testing
  - Test complete data flow from AISStream to frontend
  - Test Docker Compose deployment
  - Verify all services start correctly
  - Test health check endpoints
  - Verify real-time updates work end-to-end
  - _Requirements: 6.4, 6.5_

- [x] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
