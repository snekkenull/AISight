/**
 * ConnectionToast Component
 *
 * Smart connection status display using Sonner toast notifications.
 * Shows toast only on disconnect/reconnect, hides when connected and stable.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * EVA Styling: Requirements 5.4, 12.2
 * - Angular container styling
 * - Warning border animation for disconnect
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ConnectionStatus } from '../types';

/**
 * Props for ConnectionToast component
 */
export interface ConnectionToastProps {
  /**
   * Current WebSocket connection status
   */
  status: ConnectionStatus;
}

/**
 * ConnectionToast Component
 *
 * Displays toast notifications for connection status changes:
 * - Hidden when connected and stable (Requirements 1.1, 1.5)
 * - Shows "Connection lost. Reconnecting..." on disconnect with 5s auto-dismiss (Requirement 1.2)
 * - Shows "Reconnecting..." indicator when status is 'connecting' (Requirement 1.3)
 * - Shows brief "Connected" toast on reconnection with 2s auto-dismiss (Requirement 1.4)
 * 
 * EVA styling applied via Sonner toastOptions in sonner.tsx component
 */
export const ConnectionToast: React.FC<ConnectionToastProps> = ({ status }) => {
  const previousStatusRef = useRef<ConnectionStatus | null>(null);
  const reconnectingToastId = useRef<string | number | null>(null);
  const hasBeenConnectedRef = useRef(false);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    // Track if we've ever been connected (to avoid showing "Connected" on initial load)
    if (status === 'connected') {
      hasBeenConnectedRef.current = true;
    }

    // Dismiss reconnecting toast when status changes from 'connecting'
    if (previousStatus === 'connecting' && status !== 'connecting' && reconnectingToastId.current) {
      toast.dismiss(reconnectingToastId.current);
      reconnectingToastId.current = null;
    }

    // Handle status transitions
    if (previousStatus !== null && previousStatus !== status) {
      // Transition to disconnected: show "Connection lost" toast with warning animation (Requirements 1.2, 5.4, 12.2)
      if (status === 'disconnected' && previousStatus === 'connected') {
        toast.error('[!] CONNECTION LOST - RECONNECTING...', {
          duration: 5000,
          id: 'connection-lost',
        });
      }

      // Transition to connecting: show "Reconnecting..." indicator (Requirement 1.3)
      if (status === 'connecting' && (previousStatus === 'disconnected' || previousStatus === 'error')) {
        reconnectingToastId.current = toast.loading('[...] RECONNECTING...', {
          id: 'reconnecting',
        });
      }

      // Transition to connected after being disconnected/connecting: show "Connected" toast (Requirement 1.4)
      if (
        status === 'connected' &&
        (previousStatus === 'disconnected' || previousStatus === 'connecting' || previousStatus === 'error') &&
        hasBeenConnectedRef.current
      ) {
        // Only show "Connected" toast if we were previously connected (not on initial connection)
        if (previousStatus !== 'connecting' || previousStatusRef.current !== null) {
          toast.success('[✓] CONNECTED', {
            duration: 2000,
            id: 'connected',
          });
        }
      }

      // Handle error state
      if (status === 'error') {
        toast.error('[!] CONNECTION ERROR', {
          duration: 5000,
          id: 'connection-error',
        });
      }
    }

    // Update previous status
    previousStatusRef.current = status;
  }, [status]);

  // This component doesn't render anything visible - it only manages toasts
  // Screen reader announcement for connection status changes (Requirement 10.3)
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {status === 'connected' && 'Connection status: Connected'}
      {status === 'disconnected' && 'Connection status: Disconnected'}
      {status === 'connecting' && 'Connection status: Reconnecting'}
      {status === 'error' && 'Connection status: Error'}
    </div>
  );
};

export default ConnectionToast;
