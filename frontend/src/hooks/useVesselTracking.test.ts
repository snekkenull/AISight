import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVesselTracking } from './useVesselTracking';

// Create a mock socket that will be reused
let mockSocket: any;
let eventHandlers: Map<string, Function>;

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => mockSocket),
  };
});

describe('useVesselTracking', () => {
  beforeEach(() => {
    // Use fake timers to control setTimeout/setInterval
    vi.useFakeTimers();
    
    // Reset event handlers
    eventHandlers = new Map();
    
    // Create fresh mock socket for each test
    mockSocket = {
      connected: false,
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear all timers and restore real timers
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeNull();
  });

  it('should connect when connect() is called', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('should update status to connected when socket connects', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate socket connection
    const connectHandler = eventHandlers.get('connect');

    act(() => {
      mockSocket.connected = true;
      connectHandler?.();
    });

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle position updates', () => {
    const onPositionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useVesselTracking({ autoConnect: false, onPositionUpdate })
    );

    act(() => {
      result.current.connect();
    });

    // Simulate vessel update event
    const vesselUpdateHandler = eventHandlers.get('vesselUpdate');

    const positionUpdate = {
      mmsi: '123456789',
      timestamp: new Date().toISOString(),
      latitude: 37.7749,
      longitude: -122.4194,
      sog: 12.5,
      cog: 285.0,
    };

    act(() => {
      vesselUpdateHandler?.({
        type: 'position',
        data: positionUpdate,
        timestamp: new Date().toISOString(),
      });
    });

    expect(onPositionUpdate).toHaveBeenCalledWith(positionUpdate);
    expect(result.current.lastUpdate).not.toBeNull();
  });

  it('should handle static data updates', () => {
    const onStaticDataUpdate = vi.fn();
    const { result } = renderHook(() =>
      useVesselTracking({ autoConnect: false, onStaticDataUpdate })
    );

    act(() => {
      result.current.connect();
    });

    // Simulate vessel update event
    const vesselUpdateHandler = eventHandlers.get('vesselUpdate');

    const staticDataUpdate = {
      mmsi: '123456789',
      name: 'TEST VESSEL',
      vessel_type: 70,
    };

    act(() => {
      vesselUpdateHandler?.({
        type: 'staticData',
        data: staticDataUpdate,
        timestamp: new Date().toISOString(),
      });
    });

    expect(onStaticDataUpdate).toHaveBeenCalledWith(staticDataUpdate);
    expect(result.current.lastUpdate).not.toBeNull();
  });

  it('should handle connection errors', () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useVesselTracking({ autoConnect: false, onError })
    );

    act(() => {
      result.current.connect();
    });

    // Simulate connection error
    const errorHandler = eventHandlers.get('connect_error');

    const testError = new Error('Connection failed');

    act(() => {
      errorHandler?.(testError);
    });

    expect(onError).toHaveBeenCalledWith(testError);
    expect(result.current.error).toEqual(testError);
    expect(result.current.connectionStatus).toBe('error');
  });

  it('should disconnect when disconnect() is called', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      mockSocket.connected = true;
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('should subscribe to regions', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.connected = true;
    });

    const regions = [
      { minLat: 37.0, minLon: -123.0, maxLat: 38.0, maxLon: -122.0 },
    ];

    act(() => {
      result.current.subscribe(regions);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', { regions });
  });

  it('should unsubscribe from regions', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.connected = true;
    });

    act(() => {
      result.current.unsubscribe();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useVesselTracking({ autoConnect: true }));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should handle disconnection and update status', () => {
    const { result } = renderHook(() => useVesselTracking({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate disconnection
    const disconnectHandler = eventHandlers.get('disconnect');

    act(() => {
      mockSocket.connected = false;
      disconnectHandler?.('transport close');
    });

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });
});
