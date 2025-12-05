/**
 * Custom Hooks
 *
 * This file exports all custom React hooks for the Smart AIS MVP application.
 */

export { useVesselTracking } from './useVesselTracking';
export type { UseVesselTrackingOptions, UseVesselTrackingReturn } from './useVesselTracking';

export { useAI } from './useAI';

export { useMapVisualizations } from './useMapVisualizations';
export type { UseMapVisualizationsReturn } from './useMapVisualizations';

export { useVesselSearch } from './useVesselSearch';

export { usePersistedState } from './usePersistedState';

export { useContinuousTracking } from './useContinuousTracking';
export type {
  ContinuousTrackingOptions,
  ContinuousTrackingState,
  ContinuousTrackingActions,
  TrackedVesselInfo,
} from './useContinuousTracking';

export { useReducedMotion } from './useReducedMotion';

export { useEvaEffects } from './useEvaEffects';
export type { EvaEffectsPreferences, UseEvaEffectsReturn } from './useEvaEffects';

export { useTerminalTheme, TerminalThemeProvider, TERMINAL_THEME_STORAGE_KEY } from './useTerminalTheme';
export type { TerminalThemeContextValue } from '../types/terminal-theme';

export { useP5 } from './useP5';
export type { P5Sketch, UseP5Options, UseP5Return } from './useP5';

export { useSoundEffects } from './useSoundEffects';
export type { UseSoundEffectsReturn, SoundEffect } from './useSoundEffects';
