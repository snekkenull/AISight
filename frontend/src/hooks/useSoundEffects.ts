/**
 * useSoundEffects - React hook for terminal sound effects
 * 
 * Requirements: 14.1, 14.2, 14.6, 14.7
 * - Integrates SoundService with React
 * - Provides play functions for each effect type
 * - Respects user sound preference settings
 */

import { useCallback, useEffect, useState } from 'react';
import { soundService, type SoundEffect, type SoundServiceConfig } from '../services/SoundService';

export interface UseSoundEffectsReturn {
  /** Play a sound effect */
  play: (effect: SoundEffect) => void;
  /** Play click sound */
  playClick: () => void;
  /** Play keystroke sound */
  playKeystroke: () => void;
  /** Play alert sound */
  playAlert: () => void;
  /** Play error sound */
  playError: () => void;
  /** Play blip sound */
  playBlip: () => void;
  /** Play radar ping sound */
  playRadarPing: () => void;
  /** Whether sounds are enabled */
  enabled: boolean;
  /** Set whether sounds are enabled */
  setEnabled: (enabled: boolean) => void;
  /** Toggle sounds on/off */
  toggleEnabled: () => void;
  /** Current volume (0-1) */
  volume: number;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Current configuration */
  config: SoundServiceConfig;
}

/**
 * Hook for managing terminal sound effects
 * 
 * Provides convenient functions for playing sounds and managing preferences.
 * All sound playback respects the user's enabled/disabled preference.
 */
export function useSoundEffects(): UseSoundEffectsReturn {
  const [config, setConfig] = useState<SoundServiceConfig>(() => soundService.getConfig());

  // Initialize audio context on mount
  useEffect(() => {
    soundService.preload().catch(() => {
      // Ignore preload errors - audio will initialize on first interaction
    });
  }, []);

  // Generic play function
  const play = useCallback((effect: SoundEffect) => {
    soundService.play(effect);
  }, []);

  // Convenience functions for each sound type
  const playClick = useCallback(() => {
    soundService.play('click');
  }, []);

  const playKeystroke = useCallback(() => {
    soundService.play('keystroke');
  }, []);

  const playAlert = useCallback(() => {
    soundService.play('alert');
  }, []);

  const playError = useCallback(() => {
    soundService.play('error');
  }, []);

  const playBlip = useCallback(() => {
    soundService.play('blip');
  }, []);

  const playRadarPing = useCallback(() => {
    soundService.play('radar-ping');
  }, []);

  // Enable/disable sounds
  const setEnabled = useCallback((enabled: boolean) => {
    soundService.setEnabled(enabled);
    setConfig(soundService.getConfig());
  }, []);

  const toggleEnabled = useCallback(() => {
    const newEnabled = !soundService.isEnabled();
    soundService.setEnabled(newEnabled);
    setConfig(soundService.getConfig());
  }, []);

  // Volume control
  const setVolume = useCallback((volume: number) => {
    soundService.setVolume(volume);
    setConfig(soundService.getConfig());
  }, []);

  return {
    play,
    playClick,
    playKeystroke,
    playAlert,
    playError,
    playBlip,
    playRadarPing,
    enabled: config.enabled,
    setEnabled,
    toggleEnabled,
    volume: config.volume,
    setVolume,
    config,
  };
}

export type { SoundEffect };
