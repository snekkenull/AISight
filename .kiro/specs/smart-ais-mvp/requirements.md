# Requirements Document

## Introduction

This document defines the requirements for a Smart AIS MVP (Minimum Viable Product) web application that provides real-time vessel tracking with intelligent features. The system will stream live AIS (Automatic Identification System) data from the AISStream API, visualize vessel positions on an interactive map using GeoJSON, and provide a clean, lightweight architecture suitable for quick deployment via Docker. The MVP focuses on core functionality while maintaining code quality and thorough testing.

## Glossary

- **AIS (Automatic Identification System)**: A maritime tracking system that uses VHF radio to transmit vessel position, course, speed, and identification data
- **MMSI (Maritime Mobile Service Identity)**: A unique 9-digit identifier assigned to each vessel for AIS communication
- **WebSocket**: A protocol providing full-duplex communication channels over a single TCP connection
- **GeoJSON**: A format for encoding geographic data structures using JSON
- **Position Report**: An AIS message containing real-time vessel location, speed, and course information
- **Ship Static Data**: An AIS message containing vessel metadata such as name, dimensions, and destination
- **SOG (Speed Over Ground)**: The actual speed of the vessel relative to the ground/seabed
- **COG (Course Over Ground)**: The actual direction of vessel movement relative to the ground
- **Bounding Box**: A rectangular geographic area defined by minimum and maximum latitude/longitude coordinates
- **Backend Service**: The server-side application that processes AIS data and serves the frontend
- **Frontend Application**: The client-side web interface that displays vessel information
- **Data Pipeline**: The system component that processes incoming AIS messages and stores them

## Requirements

### Requirement 1

**User Story:** As a maritime operator, I want to view real-time vessel positions on an interactive map, so that I can monitor vessel movements in my area of interest.

#### Acceptance Criteria

1. WHEN the Frontend Application loads THEN the system SHALL display an interactive map centered on a default global view
2. WHEN the Backend Service receives a Position Report from AISStream THEN the system SHALL update the vessel marker on the map within 2 seconds
3. WHEN a user clicks on a vessel marker THEN the system SHALL display a popup containing vessel MMSI, name, speed, course, and last update time
4. WHEN vessel positions are rendered THEN the system SHALL use GeoJSON format for all geographic data structures
5. WHEN multiple vessels are visible THEN the system SHALL render vessel markers with distinct visual indicators based on vessel type

### Requirement 2

**User Story:** As a system administrator, I want to establish a reliable connection to the AISStream API, so that the application receives continuous real-time vessel data.

#### Acceptance Criteria

1. WHEN the Backend Service starts THEN the system SHALL establish a WebSocket connection to wss://stream.aisstream.io/v0/stream within 3 seconds
2. WHEN the WebSocket connection is established THEN the system SHALL send an authentication message containing the API key within 3 seconds
3. WHEN the WebSocket connection is lost THEN the system SHALL attempt to reconnect with exponential backoff up to 5 attempts
4. WHEN a Position Report message is received THEN the system SHALL parse the message and extract latitude, longitude, SOG, COG, MMSI, and timestamp
5. WHEN a Ship Static Data message is received THEN the system SHALL parse the message and extract vessel name, type, dimensions, and destination

### Requirement 3

**User Story:** As a developer, I want vessel data to be stored efficiently, so that I can query historical positions and vessel metadata.

#### Acceptance Criteria

1. WHEN the Data Pipeline receives a Position Report THEN the system SHALL store the position data with MMSI, timestamp, latitude, longitude, SOG, and COG
2. WHEN the Data Pipeline receives Ship Static Data THEN the system SHALL upsert vessel metadata indexed by MMSI
3. WHEN storing position data THEN the system SHALL use a time-series optimized storage mechanism
4. WHEN querying vessel positions THEN the system SHALL return results within 500 milliseconds for up to 1000 vessels
5. WHEN duplicate position reports are received THEN the system SHALL prevent duplicate storage based on MMSI and timestamp combination

### Requirement 4

**User Story:** As a maritime operator, I want to search and filter vessels, so that I can focus on specific vessels or vessel types of interest.

#### Acceptance Criteria

1. WHEN a user enters a vessel name or MMSI in the search field THEN the system SHALL display matching vessels within 1 second
2. WHEN a user selects a vessel type filter THEN the system SHALL display only vessels matching that type
3. WHEN a user defines a bounding box on the map THEN the system SHALL display only vessels within that geographic area
4. WHEN search results are returned THEN the system SHALL display vessel MMSI, name, current position, and last update time
5. WHEN no vessels match the search criteria THEN the system SHALL display a message indicating no results found

### Requirement 5

**User Story:** As a maritime operator, I want to view vessel tracks over time, so that I can understand vessel movement patterns and routes.

#### Acceptance Criteria

1. WHEN a user selects a vessel THEN the system SHALL display the vessel's position history for the last 24 hours as a line on the map
2. WHEN rendering vessel tracks THEN the system SHALL use GeoJSON LineString format
3. WHEN a vessel track is displayed THEN the system SHALL show timestamps at regular intervals along the track
4. WHEN the user adjusts the time range THEN the system SHALL update the displayed track within 2 seconds
5. WHEN historical position data is unavailable THEN the system SHALL display a message indicating insufficient data

### Requirement 6

**User Story:** As a system administrator, I want the application to be containerized, so that I can deploy it quickly and consistently across different environments.

#### Acceptance Criteria

1. WHEN the deployment package is provided THEN the system SHALL include a Dockerfile for the Backend Service
2. WHEN the deployment package is provided THEN the system SHALL include a Dockerfile for the Frontend Application
3. WHEN the deployment package is provided THEN the system SHALL include a docker-compose.yml file that orchestrates all services
4. WHEN docker-compose up is executed THEN the system SHALL start all required services including database, cache, backend, and frontend
5. WHEN all services are started THEN the system SHALL be accessible via http://localhost:3000 within 30 seconds

### Requirement 7

**User Story:** As a developer, I want clean, well-structured code, so that the application is maintainable and extensible.

#### Acceptance Criteria

1. WHEN code is written THEN the system SHALL follow consistent naming conventions and code style guidelines
2. WHEN components are implemented THEN the system SHALL separate concerns between data access, business logic, and presentation layers
3. WHEN functions are defined THEN the system SHALL include clear documentation describing purpose, parameters, and return values
4. WHEN modules are created THEN the system SHALL have clear interfaces and minimal coupling between components
5. WHEN configuration is needed THEN the system SHALL use environment variables rather than hardcoded values

### Requirement 8

**User Story:** As a quality assurance engineer, I want comprehensive tests, so that I can verify the application functions correctly.

#### Acceptance Criteria

1. WHEN core functionality is implemented THEN the system SHALL include unit tests achieving at least 80% code coverage
2. WHEN API endpoints are created THEN the system SHALL include integration tests verifying request/response behavior
3. WHEN the WebSocket connection is implemented THEN the system SHALL include tests verifying connection, authentication, and message handling
4. WHEN data parsing logic is implemented THEN the system SHALL include tests verifying correct parsing of Position Report and Ship Static Data messages
5. WHEN tests are executed THEN the system SHALL provide clear pass/fail results and error messages for failures

### Requirement 9

**User Story:** As a maritime operator, I want real-time updates without page refresh, so that I can monitor vessels continuously.

#### Acceptance Criteria

1. WHEN the Frontend Application connects to the Backend Service THEN the system SHALL establish a WebSocket connection for real-time updates
2. WHEN a vessel position update is received THEN the system SHALL update the map display without requiring page refresh
3. WHEN the WebSocket connection is active THEN the system SHALL display a connection status indicator showing "Connected"
4. WHEN the WebSocket connection is lost THEN the system SHALL display a connection status indicator showing "Disconnected" and attempt reconnection
5. WHEN vessel data is updated THEN the system SHALL animate the vessel marker transition smoothly to the new position

### Requirement 10

**User Story:** As a system administrator, I want the application to handle errors gracefully, so that users receive helpful feedback when issues occur.

#### Acceptance Criteria

1. WHEN the AISStream API returns an error THEN the system SHALL log the error with timestamp and error details
2. WHEN the database connection fails THEN the system SHALL display an error message to the user and attempt to reconnect
3. WHEN invalid AIS message data is received THEN the system SHALL log the invalid data and continue processing subsequent messages
4. WHEN the Frontend Application cannot connect to the Backend Service THEN the system SHALL display a user-friendly error message with troubleshooting steps
5. WHEN an unexpected error occurs THEN the system SHALL log the full error stack trace for debugging purposes
