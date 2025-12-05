# EVA Terminal Interface - Design Document

## Overview

This design document outlines the transformation of the AIS vessel tracking application into a full CRT terminal interface. The redesign simulates an authentic old-school CRT monitor with curved glass effects, restructures the layout into a terminal-based command center with permanent function blocks, and introduces advanced visualization components including a P5.js Earth globe, digital gauges, track charts, and radar scanning modules.

The design philosophy:
- **Authentic CRT simulation**: Curved glass, barrel distortion, chromatic aberration, phosphor glow
- **Terminal-first interface**: ASCII borders, monospace typography, command-line patterns
- **Permanent visualization blocks**: Always-visible specialized displays for spatial context
- **Multi-sensory feedback**: Sound effects and rich animations for immersive experience
- **Retro iconography**: Pixelated icons, no emoji, ASCII-compatible symbols

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRT Effect Layer                                   │
│  ├── Barrel Distortion Shader (WebGL/CSS)                                   │
│  ├── Chromatic Aberration                                                    │
│  ├── Scan Lines Overlay                                                      │
│  ├── Phosphor Glow Filter                                                    │
│  └── Vignette Gradient                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Terminal Layout                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        STATUS BAR                                    │    │
│  │  [NAV BUTTONS] [STATUS INDICATORS] [THEME] [TIME]                   │    │
│  ├──────────┬────────────────────────────────────┬──────────┤          │    │
│  │  LEFT    │                                    │  RIGHT   │          │    │
│  │  BLOCK   │           MAP (MAIN)               │  BLOCK   │          │    │
│  │          │                                    │          │          │    │
│  │ ┌──────┐ │                                    │ ┌──────┐ │          │    │
│  │ │GLOBE │ │                                    │ │TRACK │ │          │    │
│  │ │  or  │ │                                    │ │CHART │ │          │    │
│  │ │VESSEL│ │                                    │ ├──────┤ │          │    │
│  │ │ INFO │ │                                    │ │RADAR │ │          │    │
│  │ ├──────┤ │                                    │ │ SCAN │ │          │    │
│  │ │GAUGES│ │                                    │ └──────┘ │          │    │
│  │ └──────┘ │                                    │          │          │    │
│  ├──────────┴────────────────────────────────────┴──────────┤          │    │
│  │                    TERMINAL DIALOG (AI)                   │          │    │
│  │  > user input_                                            │          │    │
│  │  < ai response...                                         │          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
frontend/src/
├── components/
│   ├── terminal/
│   │   ├── TerminalLayout.tsx        # Main layout container
│   │   ├── StatusBar.tsx             # Top status bar with nav buttons
│   │   ├── TerminalWindow.tsx        # Reusable terminal window frame
│   │   ├── TerminalButton.tsx        # Terminal-styled button
│   │   ├── TerminalScrollbar.tsx     # Custom scrollbar styling
│   │   └── TerminalInput.tsx         # Command-line style input
│   ├── visualizations/
│   │   ├── EarthGlobe.tsx            # P5.js 3D globe component
│   │   ├── DigitalGauge.tsx          # Seven-segment gauge display
│   │   ├── TrackChart.tsx            # Vessel trajectory chart
│   │   ├── RadarScan.tsx             # Radar sweep visualization
│   │   └── index.ts
│   ├── crt/
│   │   ├── CRTEffect.tsx             # CRT simulation overlay
│   │   ├── CRTShader.ts              # WebGL shader for distortion
│   │   └── index.ts
│   ├── ai/
│   │   └── TerminalAIDialog.tsx      # Terminal-style AI chat
│   └── ui/
│       ├── PixelIcon.tsx             # Pixelated icon component
│       └── ...existing
├── hooks/
│   ├── useTerminalTheme.ts           # Theme switching hook
│   ├── useSoundEffects.ts            # Sound effect management
│   └── useP5.ts                      # P5.js integration hook
├── services/
│   └── SoundService.ts               # Audio playback service
├── assets/
│   ├── sounds/
│   │   ├── click.mp3
│   │   ├── keystroke.mp3
│   │   ├── alert.mp3
│   │   ├── blip.mp3
│   │   └── radar-ping.mp3
│   └── icons/
│       └── pixel/                    # Pixel art icon sprites
└── styles/
    ├── terminal-theme.css            # Terminal color schemes
    └── crt-effects.css               # CRT visual effects
```

## Components and Interfaces

### 1. CRT Effect Component

```typescript
// frontend/src/components/crt/CRTEffect.tsx

interface CRTEffectProps {
  enabled?: boolean;
  curvature?: number;           // 0-1, barrel distortion intensity
  chromaticAberration?: number; // 0-1, RGB separation intensity
  scanLineIntensity?: number;   // 0-1, scan line opacity
  phosphorGlow?: number;        // 0-1, glow intensity
  vignetteIntensity?: number;   // 0-1, edge darkening
}

/**
 * Full-screen CRT monitor simulation overlay
 * Uses CSS filters and optional WebGL for distortion
 */
export function CRTEffect(props: CRTEffectProps): JSX.Element;
```

### 2. Terminal Layout Component

```typescript
// frontend/src/components/terminal/TerminalLayout.tsx

interface TerminalLayoutProps {
  children: React.ReactNode;
  aiPosition?: 'bottom' | 'right';
  onAIPositionChange?: (position: 'bottom' | 'right') => void;
}

interface LayoutZones {
  statusBar: React.ReactNode;
  leftBlock: React.ReactNode;
  mainContent: React.ReactNode;
  rightBlock: React.ReactNode;
  terminalDialog: React.ReactNode;
}

/**
 * Main terminal layout container managing all zones
 */
export function TerminalLayout(props: TerminalLayoutProps): JSX.Element;
```

### 3. Terminal Window Component

```typescript
// frontend/src/components/terminal/TerminalWindow.tsx

interface TerminalWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  borderStyle?: 'single' | 'double' | 'ascii';
  showTitleBar?: boolean;
  onClose?: () => void;
}

/**
 * Reusable terminal window frame with ASCII borders
 */
export function TerminalWindow(props: TerminalWindowProps): JSX.Element;
```

### 4. Earth Globe Component

```typescript
// frontend/src/components/visualizations/EarthGlobe.tsx

interface EarthGlobeProps {
  viewportBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  colorScheme: TerminalColorScheme;
  rotationSpeed?: number;
  showCountries?: boolean;
}

/**
 * P5.js rendered 3D Earth globe with GeoJSON boundaries
 * Highlights current map viewport location
 */
export function EarthGlobe(props: EarthGlobeProps): JSX.Element;
```

### 5. Digital Gauge Component

```typescript
// frontend/src/components/visualizations/DigitalGauge.tsx

interface DigitalGaugeProps {
  value: number;
  label: string;
  format?: (value: number) => string;
  digits?: number;
  style?: 'seven-segment' | 'dot-matrix';
  colorScheme: TerminalColorScheme;
  animated?: boolean;
}

/**
 * Seven-segment or dot-matrix style numeric display
 */
export function DigitalGauge(props: DigitalGaugeProps): JSX.Element;
```

### 6. Radar Scan Component

```typescript
// frontend/src/components/visualizations/RadarScan.tsx

interface RadarScanProps {
  centerVessel?: Vessel;
  nearbyVessels: Vessel[];
  range: number;              // Range in nautical miles
  colorScheme: TerminalColorScheme;
  sweepSpeed?: number;
  showRangeRings?: boolean;
}

/**
 * Animated radar sweep display showing nearby vessels
 */
export function RadarScan(props: RadarScanProps): JSX.Element;
```

### 7. Track Chart Component

```typescript
// frontend/src/components/visualizations/TrackChart.tsx

interface TrackChartProps {
  vessel?: Vessel;
  trackHistory: Position[];
  colorScheme: TerminalColorScheme;
  showGrid?: boolean;
  showLabels?: boolean;
}

/**
 * Vessel trajectory visualization as line chart
 */
export function TrackChart(props: TrackChartProps): JSX.Element;
```

### 8. Terminal AI Dialog Component

```typescript
// frontend/src/components/ai/TerminalAIDialog.tsx

interface TerminalAIDialogProps {
  position: 'bottom' | 'right';
  onPositionChange: (position: 'bottom' | 'right') => void;
  messages: AIMessage[];
  onSendMessage: (message: string) => void;
  isProcessing?: boolean;
  colorScheme: TerminalColorScheme;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Terminal-style AI chat interface with command-line aesthetics
 */
export function TerminalAIDialog(props: TerminalAIDialogProps): JSX.Element;
```

### 9. Sound Service

```typescript
// frontend/src/services/SoundService.ts

interface SoundServiceConfig {
  enabled: boolean;
  volume: number;
}

type SoundEffect = 
  | 'click'
  | 'keystroke'
  | 'alert'
  | 'error'
  | 'blip'
  | 'radar-ping';

class SoundService {
  constructor(config: SoundServiceConfig);
  play(effect: SoundEffect): void;
  setEnabled(enabled: boolean): void;
  setVolume(volume: number): void;
  preload(): Promise<void>;
}

export const soundService: SoundService;
```

### 10. Pixel Icon Component

```typescript
// frontend/src/components/ui/PixelIcon.tsx

interface PixelIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Renders pixelated icons with crisp edges
 * Uses image-rendering: pixelated CSS
 */
export function PixelIcon(props: PixelIconProps): JSX.Element;
```

## Data Models

### Terminal Color Scheme

```typescript
interface TerminalColorScheme {
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

// Predefined schemes
const TERMINAL_SCHEMES: TerminalColorScheme[] = [
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
      success: '#ffb000',
    },
    phosphorGlow: '#ffb000',
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
  // ... more schemes
];
```

### CRT Configuration

```typescript
interface CRTConfig {
  enabled: boolean;
  curvature: number;
  chromaticAberration: number;
  scanLineIntensity: number;
  phosphorGlow: number;
  vignetteIntensity: number;
  flickerEnabled: boolean;
}

const DEFAULT_CRT_CONFIG: CRTConfig = {
  enabled: true,
  curvature: 0.3,
  chromaticAberration: 0.2,
  scanLineIntensity: 0.05,
  phosphorGlow: 0.3,
  vignetteIntensity: 0.4,
  flickerEnabled: false,
};
```

### Sound Configuration

```typescript
interface SoundConfig {
  enabled: boolean;
  volume: number;
  effects: {
    click: boolean;
    keystroke: boolean;
    alert: boolean;
    blip: boolean;
    radarPing: boolean;
  };
}
```

### Layout Configuration

```typescript
interface LayoutConfig {
  aiPosition: 'bottom' | 'right';
  leftBlockWidth: number;      // Percentage or pixels
  rightBlockWidth: number;
  statusBarHeight: number;
  terminalDialogHeight: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Reduced Motion Compliance
*For any* animated component in the application (CRT flicker, radar sweep, globe rotation, gauge transitions, panel animations), when the user has enabled reduced motion preference, the component SHALL disable or minimize animations while maintaining full functionality.
**Validates: Requirements 1.7, 15.7**

### Property 2: Terminal Window Styling Consistency
*For any* terminal window component rendered in the application, the window SHALL have uppercase title text, monospace typography, zero border-radius, and no gradient backgrounds.
**Validates: Requirements 4.3, 4.4, 4.5**

### Property 3: Global Theme Application
*For any* themed component (gauges, radar, scrollbars, icons, coverage display) and any selected color scheme, the component SHALL render using colors from the currently active terminal color scheme.
**Validates: Requirements 6.5, 8.5, 10.2, 11.3, 12.4, 16.3**

### Property 4: ASCII-Only Vessel Information
*For any* vessel information display, the rendered content SHALL contain only ASCII-compatible characters (code points 0-127) and SHALL NOT contain any emoji or unicode pictographic characters (code points in emoji ranges).
**Validates: Requirements 9.2, 9.3**

### Property 5: Theme Persistence Round-Trip
*For any* terminal color scheme selection, saving the scheme to localStorage and then loading the application SHALL restore the exact same color scheme.
**Validates: Requirements 10.5, 10.6**

### Property 6: Sound Preference Respect
*For any* sound-triggering interaction, when sound is disabled in user preferences, the Sound_System SHALL NOT play any audio. When sound is enabled, the Sound_System SHALL play the appropriate sound effect.
**Validates: Requirements 14.6, 14.7**

### Property 7: Viewport-Globe Synchronization
*For any* map viewport change (pan, zoom), the Earth globe visualization SHALL update to highlight the corresponding geographic region within 100ms of the viewport change completing.
**Validates: Requirements 5.3**

### Property 8: Vessel Selection State Transitions
*For any* vessel selection event, the left function block SHALL transition from globe/gauges view to vessel information view, and for any vessel deselection, it SHALL transition back to globe/gauges view.
**Validates: Requirements 5.6, 6.3**

### Property 9: Radar Blip Accuracy
*For any* set of nearby vessels within radar range, each vessel SHALL appear as a blip on the radar display at a position proportionally accurate to its relative bearing and distance from the selected vessel.
**Validates: Requirements 8.3**

### Property 10: AI Message Formatting
*For any* AI chat message, user messages SHALL be prefixed with "> " and assistant messages SHALL be prefixed with "< " in the rendered output.
**Validates: Requirements 13.4**

### Property 11: Layout Position Adjustment
*For any* AI dialog position change (bottom to right or right to bottom), the main layout SHALL adjust all zone dimensions to accommodate the new position without content overlap or overflow.
**Validates: Requirements 13.3**

### Property 12: Scan Line Intensity Configuration
*For any* scan line intensity value between 0 and 1, the rendered scan line overlay opacity SHALL be proportional to the configured intensity value.
**Validates: Requirements 1.5**

### Property 13: Responsive Layout Proportions
*For any* viewport size above minimum supported dimensions, all layout zones (status bar, function blocks, map, terminal dialog) SHALL remain visible and maintain proportional sizing.
**Validates: Requirements 2.7**

### Property 14: Pixelated Icon Rendering
*For any* icon rendered by the Icon_System, the CSS property image-rendering SHALL be set to 'pixelated' or 'crisp-edges', and all icons SHALL use a consistent base pixel grid size.
**Validates: Requirements 12.2, 12.3**

### Property 15: Sound Playback on Interaction
*For any* button click or text input keystroke when sound is enabled, the Sound_System SHALL trigger the corresponding sound effect (click or keystroke).
**Validates: Requirements 14.1, 14.2**

### Property 16: Data Value Animation
*For any* numeric data value change in gauges or counters, the display SHALL animate the transition from old value to new value rather than instantly switching.
**Validates: Requirements 15.4**

## Error Handling

### CRT Effect Fallbacks

1. **WebGL Not Supported**: Fall back to CSS-only effects (no barrel distortion, simplified chromatic aberration)
2. **Performance Issues**: Auto-detect low frame rate and reduce effect intensity
3. **Shader Compilation Failure**: Disable distortion effects, maintain scan lines and vignette

### P5.js Globe Fallbacks

1. **WebGL Context Lost**: Display static 2D map projection fallback
2. **GeoJSON Load Failure**: Display globe without country boundaries
3. **Performance Issues**: Reduce polygon count, disable rotation animation

### Sound System Fallbacks

1. **Audio Context Blocked**: Queue sounds until user interaction unlocks audio
2. **Sound File Load Failure**: Silently skip failed sounds, log warning
3. **Browser Audio Unsupported**: Disable sound system entirely

### Layout Fallbacks

1. **Viewport Too Small**: Stack function blocks vertically, hide non-essential elements
2. **CSS Grid Unsupported**: Fall back to flexbox layout

## Testing Strategy

### Dual Testing Approach

**Unit Tests** verify:
- Component rendering with correct props
- Theme switching updates CSS variables
- Sound service plays correct audio files
- Layout zones render in correct positions
- Terminal window border characters are correct

**Property-Based Tests** verify:
- Theme application consistency across all components
- Reduced motion compliance across all animations
- ASCII-only content in vessel information
- Layout proportions across viewport sizes
- Sound preference respect across all interactions

### Property-Based Testing Framework

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Seed-based reproducibility for debugging failures

### Test File Structure

```
frontend/src/
├── components/
│   ├── terminal/
│   │   ├── TerminalWindow.test.tsx
│   │   └── TerminalLayout.test.tsx
│   ├── visualizations/
│   │   ├── EarthGlobe.test.tsx
│   │   ├── RadarScan.test.tsx
│   │   └── DigitalGauge.test.tsx
│   └── crt/
│       └── CRTEffect.test.tsx
├── hooks/
│   └── useTerminalTheme.test.ts
├── services/
│   └── SoundService.test.ts
└── test/
    ├── terminal-theme.property.test.ts
    ├── reduced-motion.property.test.ts
    ├── ascii-content.property.test.ts
    └── layout-responsive.property.test.ts
```

### Property Test Annotations

Each property-based test MUST include a comment referencing the correctness property:
```typescript
// **Feature: eva-terminal-interface, Property 3: Global Theme Application**
```

