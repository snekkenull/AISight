/**
 * Terminal Theme Type Definitions
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * Defines terminal color schemes for EVA terminal interface
 */

/**
 * Terminal color scheme definition
 */
export interface TerminalColorScheme {
  id: string;
  name: string;
  colors: {
    background: string;      // Screen background
    foreground: string;      // Primary text color
    accent: string;          // Highlights and borders
    dim: string;             // Secondary/muted text
    error: string;           // Error/warning color
    success: string;         // Success/active color
  };
  phosphorGlow: string;      // Glow color for CRT effect
}

/**
 * Terminal theme context value
 */
export interface TerminalThemeContextValue {
  scheme: TerminalColorScheme;
  schemeId: string;
  setScheme: (schemeId: string) => void;
  availableSchemes: TerminalColorScheme[];
}

/**
 * Predefined terminal color schemes
 * Requirements: 10.3, 10.4
 */
export const TERMINAL_SCHEMES: TerminalColorScheme[] = [
  {
    id: 'green',
    name: 'Classic Green',
    colors: {
      background: '#0a0a0a',
      foreground: '#00ff41',
      accent: '#00ff41',
      dim: '#006b1a',
      error: '#ff0000',
      success: '#00ff41',
    },
    phosphorGlow: '#00ff41',
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      background: '#0a0a0a',
      foreground: '#ffb000',
      accent: '#ffb000',
      dim: '#805800',
      error: '#ff0000',
      success: '#00ff41',
    },
    phosphorGlow: '#ffb000',
  },
  {
    id: 'white',
    name: 'White',
    colors: {
      background: '#0a0a0a',
      foreground: '#ffffff',
      accent: '#ffffff',
      dim: '#808080',
      error: '#ff0000',
      success: '#00ff41',
    },
    phosphorGlow: '#ffffff',
  },
  {
    id: 'blue',
    name: 'Blue',
    colors: {
      background: '#0a0a0a',
      foreground: '#00d4ff',
      accent: '#00d4ff',
      dim: '#006b80',
      error: '#ff0000',
      success: '#00ff41',
    },
    phosphorGlow: '#00d4ff',
  },
  {
    id: 'eva-orange',
    name: 'EVA Orange',
    colors: {
      background: '#0a0a0a',
      foreground: '#ff6600',
      accent: '#ff6600',
      dim: '#803300',
      error: '#dc143c',
      success: '#00ff41',
    },
    phosphorGlow: '#ff6600',
  },
  {
    id: 'eva-red',
    name: 'EVA Red',
    colors: {
      background: '#0a0a0a',
      foreground: '#dc143c',
      accent: '#dc143c',
      dim: '#8b1a2e',  // Adjusted for 2:1+ contrast ratio
      error: '#ff0000',
      success: '#00ff41',
    },
    phosphorGlow: '#dc143c',
  },
  {
    id: 'eva-purple',
    name: 'EVA Purple',
    colors: {
      background: '#0a0a0a',
      foreground: '#9400d3',
      accent: '#9400d3',
      dim: '#7000a8',  // Adjusted for 2:1+ contrast ratio
      error: '#dc143c',
      success: '#00ff41',
    },
    phosphorGlow: '#9400d3',
  },
];

/**
 * Get a terminal scheme by ID
 */
export function getTerminalScheme(id: string): TerminalColorScheme {
  return TERMINAL_SCHEMES.find(s => s.id === id) || TERMINAL_SCHEMES[0];
}

/**
 * Default terminal scheme ID
 */
export const DEFAULT_TERMINAL_SCHEME_ID = 'eva-orange';
