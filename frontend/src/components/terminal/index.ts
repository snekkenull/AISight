/**
 * Terminal Components Index
 * 
 * Exports all terminal-styled components for the EVA terminal interface.
 */

export { TerminalWindow, BORDER_CHARS } from './TerminalWindow';
export type { TerminalWindowProps, BorderStyle } from './TerminalWindow';

export { TerminalButton } from './TerminalButton';
export type { TerminalButtonProps } from './TerminalButton';

export { TerminalInput } from './TerminalInput';
export type { TerminalInputProps } from './TerminalInput';

export { TerminalLayout, TerminalLayoutContext, useTerminalLayout } from './TerminalLayout';
export type { TerminalLayoutProps, TerminalLayoutContextValue, AIPosition } from './TerminalLayout';

export { StatusBar } from './StatusBar';
export type { StatusBarProps, StatusBarPanel } from './StatusBar';

export { TerminalVesselInfo } from './TerminalVesselInfo';
export type { TerminalVesselInfoProps, VesselInfo } from './TerminalVesselInfo';

export { TerminalAIDialog } from './TerminalAIDialog';
export type { TerminalAIDialogProps } from './TerminalAIDialog';

export { TerminalCoverageDisplay } from './TerminalCoverageDisplay';
export type { TerminalCoverageDisplayProps } from './TerminalCoverageDisplay';
