/**
 * Component exports
 */

export { MapComponent } from './MapComponent';
export type { MapComponentProps } from './MapComponent';

export { ErrorDisplay } from './ErrorDisplay';
export type { ErrorDisplayProps, ErrorSeverity, ErrorType } from './ErrorDisplay';

export { ErrorBoundary } from './ErrorBoundary';
export type { default as ErrorBoundaryType } from './ErrorBoundary';

export { EmptyMapState } from './EmptyMapState';
export type { EmptyMapStateProps } from './EmptyMapState';

export { MapVisualizations } from './MapVisualizations';
export type { MapVisualizationsProps } from './MapVisualizations';

export { DashboardPanel } from './DashboardPanel';
export { DashboardCard } from './DashboardCard';
export { VesselCountOverlay } from './VesselCountOverlay';

// ConnectionStatusBadge is deprecated - use ConnectionToast instead for smart connection status display
// ConnectionToast shows toast only on disconnect/reconnect, hidden when connected (Requirements 1.1-1.5)
export { ConnectionStatusBadge } from './ConnectionStatusBadge';
export type { ConnectionStatusBadgeProps } from './ConnectionStatusBadge';

// Preferred: ConnectionToast for smart connection status display
export { ConnectionToast } from './ConnectionToast';
export type { ConnectionToastProps } from './ConnectionToast';

export { VirtualizedVesselList } from './VirtualizedVesselList';
export type { VirtualizedVesselListProps } from './VirtualizedVesselList';

export { VesselDetailPopup } from './VesselDetailPopup';
export type { VesselDetailPopupProps } from './VesselDetailPopup';

export { DirectionalVesselMarker } from './DirectionalVesselMarker';
export type { DirectionalVesselMarkerProps } from './DirectionalVesselMarker';

export { AIChatOverlay } from './AIChatOverlay';
export type { AIChatOverlayProps } from './AIChatOverlay';

export { ThemeToggle } from './ThemeToggle';

export { EvaEffectsToggle } from './EvaEffectsToggle';

export { RegionStatusIndicator } from './RegionStatusIndicator';
export type { RegionStatusIndicatorProps } from './RegionStatusIndicator';

// CRT Effects
export { CRTEffect, DEFAULT_CRT_CONFIG } from './crt';
export type { CRTEffectProps } from './crt';

// Terminal Components
export {
  TerminalWindow,
  TerminalButton,
  TerminalInput,
  TerminalLayout,
  TerminalLayoutContext,
  useTerminalLayout,
  StatusBar,
  BORDER_CHARS,
} from './terminal';
export type {
  TerminalWindowProps,
  TerminalButtonProps,
  TerminalInputProps,
  TerminalLayoutProps,
  TerminalLayoutContextValue,
  AIPosition,
  StatusBarProps,
  StatusBarPanel,
  BorderStyle,
} from './terminal';
