/**
 * usePersistedState Hook
 *
 * A custom React hook that syncs state with localStorage, providing
 * persistent state across browser sessions.
 *
 * Features:
 * - Generic type support for any serializable value
 * - Graceful handling of SSR/missing localStorage
 * - Automatic serialization/deserialization
 * - Falls back to in-memory state when localStorage is unavailable
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Check if localStorage is available
 * Handles SSR and browsers with localStorage disabled
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Custom hook that persists state to localStorage
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no stored value exists
 * @returns A tuple of [state, setState] similar to useState
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = usePersistedState<'light' | 'dark'>('theme', 'light');
 * const [sidebarExpanded, setSidebarExpanded] = usePersistedState('sidebar-expanded', true);
 * ```
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Check localStorage availability once
  const [isAvailable] = useState(() => isLocalStorageAvailable());

  // Initialize state from localStorage or use initial value
  const [state, setState] = useState<T>(() => {
    if (!isAvailable) {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Failed to read from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to write to localStorage key "${key}":`, error);
    }
  }, [key, state, isAvailable]);

  // Wrapper for setState that handles function updates
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(value);
    },
    []
  );

  return [state, setPersistedState];
}
