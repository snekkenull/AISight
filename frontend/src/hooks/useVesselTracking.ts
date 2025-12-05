import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionStatus,
  VesselPosition,
  Vessel,
  BoundingBox,
} from '../types';
import { API_CONFIG, WEBSOCKET_CONFIG } from '../config';

/**
 * Vessel update event data
 */
interface VesselUpdateEvent {
  type: 'position' | 'staticData';
  data: VesselPosition | Vessel;
  timestamp: string;
}

/**
 * Connection event data
 */
interface ConnectionEvent {
  clientId: string;
  timestamp: string;
}

/**
 * Subscription event data
 */
interface SubscriptionEvent {
  regions?: BoundingBox[];
  timestamp: string;
}

/**
 * Hook options for vessel tracking
 */
export interface UseVesselTrackingOptions {
  autoConnect?: boolean;
  regions?: BoundingBox[];
  onPositionUpdate?: (position: VesselPosition) => void;
  onStaticDataUpdate?: (vessel: Vessel) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook return value
 */
export interface UseVesselTrackingReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (regions: BoundingBox[]) => void;
  unsubscribe: () => void;
  lastUpdate: Date | null;
}

/**
 * useVesselTracking - Custom hook for WebSocket connection and real-time vessel updates
 *
 * Manages Socket.io connection to the backend, handles reconnection logic,
 * tracks connection status, and processes vessel update events.
 *
 * @param options - Hook configuration options
 * @returns Hook state and methods for vessel tracking
 *
 * @example
 * const { connectionStatus, isConnected, connect, disconnect } = useVesselTracking({
 *   autoConnect: true,
 *   onPositionUpdate: (position) => console.log('Position update:', position),
 *   onError: (error) => console.error('Connection error:', error),
 * });
 */
export const useVesselTracking = (
  options: UseVesselTrackingOptions = {}
): UseVesselTrackingReturn => {
  const {
    autoConnect = true,
    regions,
    onPositionUpdate,
    onStaticDataUpdate,
    onError,
  } = options;

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs to maintain socket instance and prevent stale closures
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate exponential backoff delay for reconnection
   */
  const getReconnectDelay = useCallback((): number => {
    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(
      WEBSOCKET_CONFIG.reconnectionDelay * Math.pow(2, attempt),
      WEBSOCKET_CONFIG.reconnectionDelayMax
    );
    return delay;
  }, []);

  /**
   * Handle connection errors
   */
  const handleError = useCallback(
    (err: Error) => {
      console.error('WebSocket error:', err);
      setError(err);
      setConnectionStatus('error');
      
      if (onError) {
        onError(err);
      }
    },
    [onError]
  );

  /**
   * Handle vessel update events
   */
  const handleVesselUpdate = useCallback(
    (event: VesselUpdateEvent) => {
      setLastUpdate(new Date());

      if (event.type === 'position' && onPositionUpdate) {
        onPositionUpdate(event.data as VesselPosition);
      } else if (event.type === 'staticData' && onStaticDataUpdate) {
        onStaticDataUpdate(event.data as Vessel);
      }
    },
    [onPositionUpdate, onStaticDataUpdate]
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log('Already connected to WebSocket server');
      return;
    }

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      // Create Socket.io connection
      const socket = io(API_CONFIG.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: WEBSOCKET_CONFIG.timeout,
      });

      socketRef.current = socket;

      // Connection successful
      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      // Connection acknowledgment from server
      socket.on('connected', (data: ConnectionEvent) => {
        console.log('Connection acknowledged:', data.clientId);
      });

      // Vessel update events
      socket.on('vesselUpdate', handleVesselUpdate);

      // Subscription acknowledgment
      socket.on('subscribed', (data: SubscriptionEvent) => {
        console.log('Subscribed to regions:', data.regions?.length || 0);
      });

      // Unsubscription acknowledgment
      socket.on('unsubscribed', () => {
        console.log('Unsubscribed from all regions');
      });

      // Connection error
      socket.on('connect_error', (err: Error) => {
        console.error('Connection error:', err);
        handleError(err);
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < WEBSOCKET_CONFIG.reconnectionAttempts) {
          const delay = getReconnectDelay();
          console.log(
            `Reconnection attempt ${reconnectAttemptsRef.current + 1}/${WEBSOCKET_CONFIG.reconnectionAttempts} in ${delay}ms`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      });

      // Disconnection
      socket.on('disconnect', (reason: string) => {
        console.log('Disconnected from WebSocket server:', reason);
        setConnectionStatus('disconnected');

        // Attempt reconnection if disconnection was not intentional
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          console.log('Server disconnected the client');
        } else if (reconnectAttemptsRef.current < WEBSOCKET_CONFIG.reconnectionAttempts) {
          // Client-side disconnect or network issue, attempt reconnection
          const delay = getReconnectDelay();
          console.log(
            `Reconnection attempt ${reconnectAttemptsRef.current + 1}/${WEBSOCKET_CONFIG.reconnectionAttempts} in ${delay}ms`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      });

      // Socket error
      socket.on('error', (err: Error) => {
        handleError(err);
      });

      // Subscribe to regions if provided
      if (regions && regions.length > 0) {
        socket.emit('subscribe', { regions });
      }
    } catch (err) {
      handleError(err as Error);
    }
  }, [handleVesselUpdate, handleError, getReconnectDelay, regions]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnection attempts
    reconnectAttemptsRef.current = 0;

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  /**
   * Subscribe to specific geographic regions
   */
  const subscribe = useCallback((newRegions: BoundingBox[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { regions: newRegions });
    } else {
      console.warn('Cannot subscribe: not connected to WebSocket server');
    }
  }, []);

  /**
   * Unsubscribe from all regions
   */
  const unsubscribe = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe');
    } else {
      console.warn('Cannot unsubscribe: not connected to WebSocket server');
    }
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  /**
   * Derived state: is connected
   */
  const isConnected = connectionStatus === 'connected';

  return {
    connectionStatus,
    isConnected,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    lastUpdate,
  };
};
