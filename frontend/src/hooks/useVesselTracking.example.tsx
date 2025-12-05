/**
 * Example usage of useVesselTracking hook
 * 
 * This file demonstrates how to use the useVesselTracking custom hook
 * for real-time vessel tracking in React components.
 */

import React from 'react';
import { useVesselTracking } from './useVesselTracking';
import { VesselPosition, Vessel } from '../types';

/**
 * Example 1: Basic usage with auto-connect
 */
export const BasicVesselTracking: React.FC = () => {
  const { connectionStatus, isConnected, error } = useVesselTracking({
    autoConnect: true,
  });

  return (
    <div>
      <h2>Connection Status: {connectionStatus}</h2>
      {isConnected && <p>✓ Connected to vessel tracking</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
};

/**
 * Example 2: With position update handler
 */
export const VesselPositionTracker: React.FC = () => {
  const [positions, setPositions] = React.useState<VesselPosition[]>([]);

  const { isConnected, lastUpdate } = useVesselTracking({
    autoConnect: true,
    onPositionUpdate: (position) => {
      console.log('New position:', position);
      setPositions((prev) => [...prev, position].slice(-100)); // Keep last 100
    },
  });

  return (
    <div>
      <h2>Vessel Positions ({positions.length})</h2>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Last Update: {lastUpdate?.toLocaleTimeString()}</p>
      <ul>
        {positions.slice(-10).map((pos, idx) => (
          <li key={idx}>
            MMSI: {pos.mmsi} - Lat: {pos.latitude}, Lon: {pos.longitude}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example 3: With static data handler
 */
export const VesselMetadataTracker: React.FC = () => {
  const [vessels, setVessels] = React.useState<Map<string, Vessel>>(new Map());

  const { isConnected } = useVesselTracking({
    autoConnect: true,
    onStaticDataUpdate: (vessel) => {
      console.log('Vessel metadata:', vessel);
      setVessels((prev) => new Map(prev).set(vessel.mmsi, vessel));
    },
  });

  return (
    <div>
      <h2>Known Vessels ({vessels.size})</h2>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <ul>
        {Array.from(vessels.values()).map((vessel) => (
          <li key={vessel.mmsi}>
            {vessel.name} (MMSI: {vessel.mmsi}) - Type: {vessel.vessel_type}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example 4: Manual connection control
 */
export const ManualConnectionControl: React.FC = () => {
  const { connectionStatus, connect, disconnect, isConnected } = useVesselTracking({
    autoConnect: false,
  });

  return (
    <div>
      <h2>Manual Connection Control</h2>
      <p>Status: {connectionStatus}</p>
      <button onClick={connect} disabled={isConnected}>
        Connect
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
    </div>
  );
};

/**
 * Example 5: Regional subscription
 */
export const RegionalVesselTracking: React.FC = () => {
  const { isConnected, subscribe, unsubscribe } = useVesselTracking({
    autoConnect: true,
  });

  const subscribeToBayArea = () => {
    subscribe([
      {
        minLat: 37.0,
        minLon: -123.0,
        maxLat: 38.0,
        maxLon: -122.0,
      },
    ]);
  };

  return (
    <div>
      <h2>Regional Tracking</h2>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <button onClick={subscribeToBayArea} disabled={!isConnected}>
        Subscribe to Bay Area
      </button>
      <button onClick={unsubscribe} disabled={!isConnected}>
        Unsubscribe
      </button>
    </div>
  );
};

/**
 * Example 6: Complete vessel tracking with error handling
 */
export const CompleteVesselTracker: React.FC = () => {
  const [positions, setPositions] = React.useState<VesselPosition[]>([]);
  const [vessels, setVessels] = React.useState<Map<string, Vessel>>(new Map());
  const [errorLog, setErrorLog] = React.useState<string[]>([]);

  const {
    connectionStatus,
    isConnected,
    error,
    connect,
    disconnect,
    subscribe,
    lastUpdate,
  } = useVesselTracking({
    autoConnect: true,
    onPositionUpdate: (position) => {
      setPositions((prev) => [...prev, position].slice(-100));
    },
    onStaticDataUpdate: (vessel) => {
      setVessels((prev) => new Map(prev).set(vessel.mmsi, vessel));
    },
    onError: (err) => {
      setErrorLog((prev) => [...prev, `${new Date().toISOString()}: ${err.message}`]);
    },
  });

  return (
    <div>
      <h1>Complete Vessel Tracker</h1>
      
      <section>
        <h2>Connection</h2>
        <p>Status: {connectionStatus}</p>
        <p>Last Update: {lastUpdate?.toLocaleTimeString() || 'Never'}</p>
        <button onClick={connect} disabled={isConnected}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!isConnected}>
          Disconnect
        </button>
        <button
          onClick={() =>
            subscribe([
              { minLat: 37.0, minLon: -123.0, maxLat: 38.0, maxLon: -122.0 },
            ])
          }
          disabled={!isConnected}
        >
          Subscribe to Region
        </button>
      </section>

      <section>
        <h2>Vessels ({vessels.size})</h2>
        <ul>
          {Array.from(vessels.values())
            .slice(0, 10)
            .map((vessel) => (
              <li key={vessel.mmsi}>
                {vessel.name} - {vessel.mmsi}
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h2>Recent Positions ({positions.length})</h2>
        <ul>
          {positions.slice(-5).map((pos, idx) => (
            <li key={idx}>
              {pos.mmsi}: ({pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)})
              @ {new Date(pos.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <section>
          <h2>Current Error</h2>
          <p style={{ color: 'red' }}>{error.message}</p>
        </section>
      )}

      {errorLog.length > 0 && (
        <section>
          <h2>Error Log</h2>
          <ul>
            {errorLog.slice(-5).map((log, idx) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
