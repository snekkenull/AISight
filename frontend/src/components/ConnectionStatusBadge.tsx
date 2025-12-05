/**
 * ConnectionStatusBadge Component
 * 
 * A single, compact connection status indicator designed for map overlay.
 * Displays a colored dot with status text and shows toast notifications on disconnect.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import React, { useEffect, useState, useRef } from 'react';
import { ConnectionStatus } from '../types';

/**
 * Props for ConnectionStatusBadge component
 */
export interface ConnectionStatusBadgeProps {
  /**
   * Current WebSocket connection status
   */
  status: ConnectionStatus;
  
  /**
   * Optional CSS class name for styling
   */
  className?: string;
}

/**
 * Toast notification component for disconnect events
 */
interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] bg-status-error text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-slide-down"
      role="alert"
      aria-live="assertive"
    >
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-gray-200 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * ConnectionStatusBadge Component
 * 
 * Single badge with colored dot and status text positioned in top-right of map.
 * Shows toast notification on disconnect with auto-dismiss after 5 seconds.
 */
export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const [showToast, setShowToast] = useState(false);
  const previousStatusRef = useRef<ConnectionStatus>(status);

  // Show toast when transitioning to disconnected state
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    
    // Show toast when transitioning from connected/connecting to disconnected
    if (
      (previousStatus === 'connected' || previousStatus === 'connecting') &&
      status === 'disconnected'
    ) {
      setShowToast(true);
    }
    
    previousStatusRef.current = status;
  }, [status]);

  /**
   * Get status display text based on connection status
   */
  const getStatusText = (): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  /**
   * Get status color classes for the indicator dot
   * Using brighter colors for visual indicators (dots)
   */
  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'; // Brighter green for dot
      case 'disconnected':
        return 'bg-red-500'; // Brighter red for dot
      case 'connecting':
        return 'bg-amber-500'; // Brighter amber for dot
      case 'error':
        return 'bg-red-500'; // Brighter red for dot
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Get text color classes based on connection status
   */
  const getTextColor = (): string => {
    switch (status) {
      case 'connected':
        return 'text-status-success';
      case 'disconnected':
        return 'text-status-error';
      case 'connecting':
        return 'text-status-warning';
      case 'error':
        return 'text-status-error';
      default:
        return 'text-text-secondary';
    }
  };

  /**
   * Determine if the indicator should pulse (for connecting state)
   */
  const shouldPulse = status === 'connecting';

  return (
    <>
      {/* Screen reader announcement for connection status changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Connection status: {getStatusText()}
      </div>

      {/* Connection Status Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-bg-primary dark:bg-gray-800 rounded-md border border-border dark:border-gray-700 shadow-sm ${className}`}
        role="status"
        aria-label={`Connection status: ${getStatusText()}`}
      >
        {/* Status indicator dot */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${
              shouldPulse ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Status text */}
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Toast notification for disconnect */}
      {showToast && (
        <Toast
          message="Connection lost. Reconnecting..."
          onDismiss={() => setShowToast(false)}
        />
      )}
    </>
  );
};

export default ConnectionStatusBadge;
