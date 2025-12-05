/**
 * Application Configuration
 *
 * Centralizes access to environment variables and application settings.
 * All environment variables are accessed through this module to ensure
 * type safety and provide defaults.
 */

/**
 * API configuration
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  timeout: 10000, // 10 seconds
} as const;

/**
 * Map configuration
 */
export const MAP_CONFIG = {
  defaultCenter: {
    lat: Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 37.7749,
    lon: Number(import.meta.env.VITE_MAP_DEFAULT_LON) || -122.4194,
  },
  defaultZoom: Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 10,
  minZoom: 2,
  maxZoom: 18,
} as const;

/**
 * WebSocket configuration
 */
export const WEBSOCKET_CONFIG = {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000, // 1 second
  reconnectionDelayMax: 5000, // 5 seconds
  timeout: 20000, // 20 seconds
} as const;

/**
 * Application configuration
 */
export const APP_CONFIG = {
  name: 'Smart AIS MVP',
  version: '1.0.0',
  updateInterval: 100, // milliseconds between batch updates
  searchDebounceDelay: 300, // milliseconds
} as const;

/**
 * AI/LLM configuration
 */
export const AI_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_LLM_API_BASE_URL || 'https://api.groq.com/openai/v1',
  model: import.meta.env.VITE_LLM_MODEL || 'moonshotai/kimi-k2-instruct-0905',
  apiKey: import.meta.env.VITE_LLM_API_KEY || '',
} as const;

// Debug logging
console.log('AI_CONFIG loaded:', {
  apiBaseUrl: AI_CONFIG.apiBaseUrl,
  model: AI_CONFIG.model,
  apiKeyPresent: AI_CONFIG.apiKey.length > 0,
  apiKeyLength: AI_CONFIG.apiKey.length,
  rawEnvValue: import.meta.env.VITE_LLM_API_KEY,
});

/**
 * Check if AI is properly configured
 */
export const isAIConfigured = (): boolean => {
  return AI_CONFIG.apiKey.length > 0;
};

/**
 * Position data age thresholds configuration
 * 
 * These thresholds determine how position data is classified:
 * - ACTIVE: Position data is current (< staleThresholdHours)
 * - STALE: Position data is stale (staleThresholdHours to veryStaleThresholdHours)
 * - VERY_STALE: Position data is very stale (veryStaleThresholdHours to noDataThresholdHours)
 * - NO_DATA: Position data is too old or missing (> noDataThresholdHours)
 */
export const POSITION_AGE_CONFIG = {
  // Threshold for "stale" status (default: 1 hour)
  staleThresholdHours: Number(import.meta.env.VITE_POSITION_STALE_THRESHOLD_HOURS) || 1,
  
  // Threshold for "very stale" status (default: 24 hours)
  veryStaleThresholdHours: Number(import.meta.env.VITE_POSITION_VERY_STALE_THRESHOLD_HOURS) || 24,
  
  // Threshold for "no data" status (default: 168 hours = 7 days)
  noDataThresholdHours: Number(import.meta.env.VITE_POSITION_NO_DATA_THRESHOLD_HOURS) || 168,
} as const;
