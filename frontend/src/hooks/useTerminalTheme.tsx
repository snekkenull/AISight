/**
 * useTerminalTheme - Terminal theme management hook with React context
 * 
 * Requirements: 10.5, 10.6
 * - Persists theme selection to localStorage
 * - Restores previously selected color scheme on load
 * - Provides theme switching functionality
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  TerminalThemeContextValue,
  TERMINAL_SCHEMES,
  getTerminalScheme,
  DEFAULT_TERMINAL_SCHEME_ID,
} from '../types/terminal-theme';

const TERMINAL_THEME_STORAGE_KEY = 'terminal-theme-scheme';

/**
 * Get the initial terminal scheme from localStorage or default
 */
function getInitialSchemeId(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(TERMINAL_THEME_STORAGE_KEY);
      if (stored && TERMINAL_SCHEMES.some(s => s.id === stored)) {
        return stored;
      }
    } catch {
      // localStorage may not be available
    }
  }
  return DEFAULT_TERMINAL_SCHEME_ID;
}

/**
 * Apply terminal scheme CSS class to document root
 */
function applySchemeToDocument(schemeId: string): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Remove all existing terminal scheme classes
  TERMINAL_SCHEMES.forEach(scheme => {
    root.classList.remove(`terminal-scheme-${scheme.id}`);
  });
  
  // Add the new scheme class
  root.classList.add(`terminal-scheme-${schemeId}`);
}

/**
 * Terminal theme context
 */
const TerminalThemeContext = createContext<TerminalThemeContextValue | undefined>(undefined);

/**
 * Terminal theme provider props
 */
interface TerminalThemeProviderProps {
  children: ReactNode;
  defaultSchemeId?: string;
}

/**
 * Terminal theme provider component
 * 
 * Manages terminal color scheme state and applies CSS classes
 */
export function TerminalThemeProvider({ 
  children, 
  defaultSchemeId 
}: TerminalThemeProviderProps) {
  const [schemeId, setSchemeId] = useState<string>(() => {
    return defaultSchemeId || getInitialSchemeId();
  });

  const scheme = getTerminalScheme(schemeId);

  // Apply scheme class to document and persist to localStorage
  useEffect(() => {
    applySchemeToDocument(schemeId);
    
    try {
      localStorage.setItem(TERMINAL_THEME_STORAGE_KEY, schemeId);
    } catch {
      // localStorage may not be available
    }
  }, [schemeId]);

  const setScheme = useCallback((newSchemeId: string) => {
    // Validate the scheme exists
    if (TERMINAL_SCHEMES.some(s => s.id === newSchemeId)) {
      setSchemeId(newSchemeId);
    }
  }, []);

  const value: TerminalThemeContextValue = {
    scheme,
    schemeId,
    setScheme,
    availableSchemes: TERMINAL_SCHEMES,
  };

  return (
    <TerminalThemeContext.Provider value={value}>
      {children}
    </TerminalThemeContext.Provider>
  );
}

/**
 * Hook to access terminal theme context
 * 
 * @throws Error if used outside of TerminalThemeProvider
 */
export function useTerminalTheme(): TerminalThemeContextValue {
  const context = useContext(TerminalThemeContext);
  
  if (context === undefined) {
    throw new Error('useTerminalTheme must be used within a TerminalThemeProvider');
  }
  
  return context;
}

/**
 * Export the context for testing purposes
 */
export { TerminalThemeContext };

/**
 * Export storage key for testing
 */
export { TERMINAL_THEME_STORAGE_KEY };
