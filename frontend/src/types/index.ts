/**
 * TypeScript Type Definitions
 *
 * This file contains shared type definitions for the Smart AIS MVP frontend.
 * These types align with the backend API and data models.
 */

// Terminal theme types
export type {
  TerminalColorScheme,
  TerminalThemeContextValue,
} from './terminal-theme';

export {
  TERMINAL_SCHEMES,
  getTerminalScheme,
  DEFAULT_TERMINAL_SCHEME_ID,
} from './terminal-theme';

/**
 * Vessel metadata from Ship Static Data
 */
export interface Vessel {
  mmsi: string;
  imo_number?: number;
  name: string;
  call_sign?: string;
  vessel_type: number;
  dimension_a?: number;
  dimension_b?: number;
  dimension_c?: number;
  dimension_d?: number;
  draught?: number;
  destination?: string;
  eta?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Vessel position from Position Report
 */
export interface VesselPosition {
  mmsi: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  true_heading?: number;
  navigational_status?: number;
  rate_of_turn?: number;
}

/**
 * Combined vessel with current position
 */
export interface VesselWithPosition extends Vessel {
  position?: VesselPosition;
}

/**
 * Position data status classification based on age
 */
export enum PositionDataStatus {
  ACTIVE = 'active',           // < 1 hour
  STALE = 'stale',             // 1-24 hours
  VERY_STALE = 'very_stale',   // 24 hours - 7 days
  NO_DATA = 'no_data'          // > 7 days or missing
}

/**
 * Vessel position status with metadata
 */
export interface VesselPositionStatus {
  vessel: VesselWithPosition;
  status: PositionDataStatus;
  ageHours: number | null;
  lastUpdate: Date | null;
}

/**
 * Bounding box for geographic filtering
 */
export interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * Vessel query parameters
 */
export interface VesselQuery {
  mmsi?: string;
  name?: string;
  type?: number;
  bbox?: BoundingBox;
  speedMin?: number;
  speedMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Search filter criteria
 */
export interface SearchFilterCriteria {
  searchText: string;
  boundingBox: BoundingBox | null;
}

/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * GeoJSON LineString geometry
 */
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // Array of [longitude, latitude]
}

/**
 * GeoJSON Feature for vessel position
 */
export interface VesselPositionFeature {
  type: 'Feature';
  geometry: GeoJSONPoint;
  properties: {
    mmsi: string;
    name?: string;
    sog: number;
    cog: number;
    heading?: number;
    timestamp: string;
    vesselType: number;
  };
}

/**
 * GeoJSON Feature for vessel track
 */
export interface VesselTrackFeature {
  type: 'Feature';
  geometry: GeoJSONLineString;
  properties: {
    mmsi: string;
    startTime: string;
    endTime: string;
  };
}

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * WebSocket message types
 */
export interface VesselUpdateMessage {
  type: 'vesselUpdate';
  data: VesselWithPosition;
}

export interface PositionUpdateMessage {
  type: 'positionUpdate';
  data: VesselPosition;
}

export interface StaticDataUpdateMessage {
  type: 'staticDataUpdate';
  data: Vessel;
}

export type WebSocketMessage =
  | VesselUpdateMessage
  | PositionUpdateMessage
  | StaticDataUpdateMessage;

/**
 * API Error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

/**
 * AI/LLM Types
 */

/**
 * AI Configuration
 */
export interface AIConfiguration {
  apiBaseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
  visualizations?: MapVisualization[];
}

/**
 * Chat context provided to AI
 */
export interface ChatContext {
  vessels: Map<string, VesselWithPosition>;
  selectedVessel: string | null;
  mapBounds: BoundingBox;
}

/**
 * AI response
 */
export interface AIResponse {
  message: string;
  toolCalls?: ToolCallResult[];
  visualizations?: MapVisualization[];
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  error?: string;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * AI Error types
 */
export type AIErrorCode = 'CONFIG_ERROR' | 'API_ERROR' | 'TOOL_ERROR' | 'TIMEOUT';

export interface AIError {
  code: AIErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

/**
 * Map Visualization Types
 */

export interface MapVisualization {
  id: string;
  type: 'circle' | 'line' | 'point' | 'polygon';
  data: CircleVisualization | LineVisualization | PointVisualization;
  style: VisualizationStyle;
  label?: string;
}

export interface CircleVisualization {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
}

export interface LineVisualization {
  points: Array<{ latitude: number; longitude: number }>;
}

export interface PointVisualization {
  position: { latitude: number; longitude: number };
  icon?: string;
}

export interface VisualizationStyle {
  color: string;
  opacity: number;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
}

/**
 * AI Tool Input/Output Types
 */

/**
 * lookupVessel tool
 */
export interface LookupVesselInput {
  mmsi?: string;
  imo?: string;
}

export interface LookupVesselOutput {
  found: boolean;
  vessel?: {
    mmsi: string;
    name: string;
    type: number;
    position: {
      latitude: number;
      longitude: number;
    };
    speed: number;
    course: number;
    lastUpdate: string;
  };
  error?: string;
}

/**
 * findNearbyVessels tool
 */
export interface FindNearbyVesselsInput {
  latitude: number;
  longitude: number;
  radiusNm: number; // Nautical miles
}

export interface FindNearbyVesselsOutput {
  vessels: Array<{
    mmsi: string;
    name: string;
    distanceNm: number;
    bearing: number;
    position: { latitude: number; longitude: number };
  }>;
  searchCenter: { latitude: number; longitude: number };
  searchRadiusNm: number;
}

/**
 * analyzeCollisionRisk tool
 */
export interface AnalyzeCollisionRiskInput {
  mmsi?: string; // Analyze for specific vessel, or all if omitted
  cpaThresholdNm?: number; // Default: 0.5 nm
  tcpaThresholdMin?: number; // Default: 30 minutes
}

export interface CollisionRisk {
  vessel1: { mmsi: string; name: string };
  vessel2: { mmsi: string; name: string };
  cpaNm: number;
  tcpaMinutes: number;
  cpaPoint: { latitude: number; longitude: number };
  vessel1Path: Array<{ latitude: number; longitude: number }>;
  vessel2Path: Array<{ latitude: number; longitude: number }>;
}

export interface AnalyzeCollisionRiskOutput {
  risks: CollisionRisk[];
  analyzedVessels: number;
  timestamp: string;
}

/**
 * analyzeVesselBehavior tool
 */
export interface AnalyzeVesselBehaviorInput {
  mmsi?: string; // Analyze specific vessel, or all if omitted
  behaviorType?: 'all' | 'anchored' | 'fishing' | 'maneuvering' | 'drifting';
}

export interface VesselBehaviorResult {
  mmsi: string;
  name: string;
  behavior: string;
  confidence: 'high' | 'medium' | 'low';
  navStatus: string;
  speed: number;
  isturning: boolean;
  turnDirection?: 'left' | 'right';
  position: { latitude: number; longitude: number };
}

export interface AnalyzeVesselBehaviorOutput {
  vessels: VesselBehaviorResult[];
  summary: {
    total: number;
    transiting: number;
    anchored: number;
    moored: number;
    fishing: number;
    maneuvering: number;
    drifting: number;
    stationary: number;
  };
  timestamp: string;
}


/**
 * analyzeNavigationSafety tool
 * Comprehensive safety analysis incorporating sea conditions
 */
export interface AnalyzeNavigationSafetyInput {
  mmsi?: string; // Analyze specific vessel, or all if omitted
  includeWeather?: boolean; // Include weather impact analysis (default: true)
}

export interface WeatherImpact {
  severity: 'low' | 'moderate' | 'high' | 'severe';
  factors: string[];
  recommendations: string[];
  windEffect: {
    speed: number;
    beaufort: number;
    impact: string;
  };
  seaStateEffect: {
    waveHeight: number;
    seaState: number;
    impact: string;
  };
  visibilityEffect: {
    distance: number;
    impact: string;
  };
}

export interface NavigationSafetyResult {
  vessel: {
    mmsi: string;
    name: string;
    position: { latitude: number; longitude: number };
    speed: number;
    course: number;
  };
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  collisionRisks: Array<{
    otherVessel: { mmsi: string; name: string };
    cpaNm: number;
    tcpaMinutes: number;
    riskLevel: 'low' | 'moderate' | 'high';
  }>;
  weatherImpact?: WeatherImpact;
  safetyFactors: {
    factor: string;
    status: 'safe' | 'caution' | 'warning' | 'danger';
    details: string;
  }[];
  recommendations: string[];
}

export interface AnalyzeNavigationSafetyOutput {
  success: boolean;
  results: NavigationSafetyResult[];
  summary: {
    totalAnalyzed: number;
    criticalRisk: number;
    highRisk: number;
    moderateRisk: number;
    lowRisk: number;
    weatherWarnings: string[];
  };
  timestamp: string;
  error?: string;
}

/**
 * getSeaConditions tool
 */
export interface GetSeaConditionsInput {
  latitude: number;
  longitude: number;
  mmsi?: string; // Optional: get conditions at vessel's location
}

export interface SeaConditions {
  location: { latitude: number; longitude: number };
  timestamp: string;
  wind: {
    speed: number; // knots
    direction: number; // degrees (0-360)
    gustSpeed?: number; // knots
    beaufortScale: number; // 0-12
    description: string;
  };
  waves: {
    height: number; // meters
    period: number; // seconds
    direction: number; // degrees (0-360)
    description: string;
  };
  swell?: {
    height: number; // meters
    period: number; // seconds
    direction: number; // degrees
  };
  seaState: {
    code: number; // Douglas sea scale 0-9
    description: string;
  };
  visibility: {
    distance: number; // nautical miles
    description: string;
  };
  temperature: {
    air: number; // Celsius
    seaSurface: number; // Celsius
  };
  pressure: {
    value: number; // hPa/mbar
    trend: 'rising' | 'falling' | 'steady';
  };
  conditions: string; // Overall conditions summary
  warnings?: string[]; // Active weather warnings
}

export interface GetSeaConditionsOutput {
  success: boolean;
  conditions?: SeaConditions;
  error?: string;
}

/**
 * getWeatherForecast tool
 */
export interface GetWeatherForecastInput {
  latitude: number;
  longitude: number;
  hours?: number; // Forecast hours ahead (default: 24)
}

export interface WeatherForecastPeriod {
  time: string;
  wind: {
    speed: number;
    direction: number;
    gustSpeed?: number;
  };
  waves: {
    height: number;
    period: number;
    direction: number;
  };
  visibility: number;
  precipitation: number; // mm
  conditions: string;
}

export interface GetWeatherForecastOutput {
  success: boolean;
  location: { latitude: number; longitude: number };
  forecast?: WeatherForecastPeriod[];
  error?: string;
}
