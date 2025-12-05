/**
 * useEvaEffects Hook
 * Requirements: 3.3
 * 
 * Manages EVA visual effects preferences with localStorage persistence.
 * Allows users to toggle scan lines and vignette effects on/off.
 */

import { useState, useEffect, useCallback } from 'react';

const EVA_EFFECTS_STORAGE_KEY = 'eva-effects-enabled';

export interface EvaEffectsPreferences {
  enabled: boolean;
}

export interface UseEvaEffectsReturn {
  effectsEnabled: boolean;
  toggleEffects: () => void;
  setEffectsEnabled: (enabled: boolean) => void;
}

/**
 * Get initial effects preference from localStorage
 * Defaults to true (effects enabled) if no preference is stored
 */
function getInitialPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  try {
    const stored = localStorage.getItem(EVA_EFFECTS_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch {
    // localStorage may not be available
  }
  
  return true; // Default to effects enabled
}

/**
 * Hook to manage EVA effects preferences
 * @returns Object with effectsEnabled state and toggle/set functions
 */
export function useEvaEffects(): UseEvaEffectsReturn {
  const [effectsEnabled, setEffectsEnabledState] = useState<boolean>(getInitialPreference);

  // Persist preference to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(EVA_EFFECTS_STORAGE_KEY, String(effectsEnabled));
    } catch {
      // localStorage may not be available
    }
  }, [effectsEnabled]);

  const toggleEffects = useCallback(() => {
    setEffectsEnabledState(prev => !prev);
  }, []);

  const setEffectsEnabled = useCallback((enabled: boolean) => {
    setEffectsEnabledState(enabled);
  }, []);

  return {
    effectsEnabled,
    toggleEffects,
    setEffectsEnabled,
  };
}

export default useEvaEffects;
