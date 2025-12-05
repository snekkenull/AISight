import React from 'react';
import { ConnectionStatus as ConnectionStatusType } from '../types';

/**
 * Props for ConnectionStatus component
 */
export interface ConnectionStatusProps {
  /**
   * Current WebSocket connection status
   */
  status: ConnectionStatusType;
  
  /**
   * Optional error message to display
   */
  error?: Error | null;
  
  /**
   * Optional CSS class name for styling
   */
  className?: string;
}

/**
 * ConnectionStatus Component
 * 
 * Displays the current WebSocket connection status with a visual indicator.
 * Shows "Connected" (green dot) when active, "Disconnected" (red dot) when lost,
 * "Connecting..." (yellow dot) during connection, and "Error" (red dot) on failure.
 * 
 * EVA Styling: Requirements 5.1
 * - Pulsing animation on status indicator
 * - EVA warning colors for different states
 * 
 * @param props - Component props
 * @returns ConnectionStatus component
 * 
 * @example
 * <ConnectionStatus status="connected" />
 * <ConnectionStatus status="disconnected" error={new Error('Connection failed')} />
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  error,
  className = '',
}) => {
  /**
   * Get status display text based on connection status
   */
  const getStatusText = (): string => {
    switch (status) {
      case 'connected':
        return 'CONNECTED';
      case 'disconnected':
        return 'DISCONNECTED';
      case 'connecting':
        return 'CONNECTING...';
      case 'error':
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  };

  /**
   * Get status color classes for the indicator dot (EVA colors)
   */
  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return 'bg-eva-accent-green';
      case 'disconnected':
        return 'bg-eva-accent-red';
      case 'connecting':
        return 'bg-eva-accent-orange';
      case 'error':
        return 'bg-eva-accent-red';
      default:
        return 'bg-eva-text-secondary';
    }
  };

  /**
   * Get text color classes based on connection status (EVA colors)
   */
  const getTextColor = (): string => {
    switch (status) {
      case 'connected':
        return 'text-eva-accent-green';
      case 'disconnected':
        return 'text-eva-accent-red';
      case 'connecting':
        return 'text-eva-accent-orange';
      case 'error':
        return 'text-eva-accent-red';
      default:
        return 'text-eva-text-secondary';
    }
  };

  /**
   * Determine if the indicator should pulse
   * Requirements 5.1: Pulsing animation for all states
   */
  const shouldPulse = true;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-eva-bg-secondary border border-eva-border-accent font-eva-mono uppercase text-xs tracking-wide ${className}`}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${getStatusText()}`}
    >
      {/* Status indicator dot with pulsing animation */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${
            shouldPulse ? 'animate-eva-pulse' : ''
          }`}
          aria-hidden="true"
        />
        {/* Glow effect for pulsing */}
        {shouldPulse && (
          <div
            className={`absolute w-2.5 h-2.5 rounded-full ${getStatusColor()} opacity-50 animate-ping`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Status text */}
      <span className={`text-xs font-medium ${getTextColor()}`}>
        {getStatusText()}
      </span>

      {/* Error message tooltip (if error exists) */}
      {error && status === 'error' && (
        <div
          className="text-xs text-eva-text-secondary ml-1"
          title={error.message}
          aria-label={`Error: ${error.message}`}
        >
          [!]
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
