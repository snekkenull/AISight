/**
 * API Services
 *
 * This file serves as the central export point for all API client services
 * in the Smart AIS MVP application.
 *
 * Services handle communication with the backend REST API and WebSocket server.
 */

export { AIService, aiService } from './AIService';
export { lookupVessel, findNearbyVessels, analyzeCollisionRisk } from './AITools';
export * as VesselAPI from './VesselAPI';
export { soundService, SoundService, SOUND_STORAGE_KEY } from './SoundService';
export type { SoundEffect, SoundServiceConfig } from './SoundService';
export type { AIResponse, AIError, ChatContext, ToolDefinition, ToolCallResult } from '../types';
