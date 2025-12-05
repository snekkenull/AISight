import React from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { useVesselTracking } from '../hooks/useVesselTracking';

/**
 * Example 1: Basic usage with useVesselTracking hook
 */
export const BasicConnectionStatusExample: React.FC = () => {
  const { connectionStatus, error } = useVesselTracking({
    autoConnect: true,
  });

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
      <ConnectionStatus status={connectionStatus} error={error} />
    </div>
  );
};

/**
 * Example 2: All connection states
 */
export const AllStatesExample: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">All Connection States</h2>
      
      <div>
        <p className="text-sm text-gray-600 mb-2">Connected:</p>
        <ConnectionStatus status="connected" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Disconnected:</p>
        <ConnectionStatus status="disconnected" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Connecting:</p>
        <ConnectionStatus status="connecting" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Error:</p>
        <ConnectionStatus
          status="error"
          error={new Error('Failed to connect to server')}
        />
      </div>
    </div>
  );
};

/**
 * Example 3: Custom styling
 */
export const CustomStyledExample: React.FC = () => {
  const { connectionStatus, error } = useVesselTracking({
    autoConnect: true,
  });

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Custom Styled</h2>
      <ConnectionStatus
        status={connectionStatus}
        error={error}
        className="border-2 border-blue-500"
      />
    </div>
  );
};

/**
 * Example 4: In a header/navbar
 */
export const HeaderExample: React.FC = () => {
  const { connectionStatus, error } = useVesselTracking({
    autoConnect: true,
  });

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Smart AIS MVP</h1>
        <ConnectionStatus status={connectionStatus} error={error} />
      </div>
    </header>
  );
};

/**
 * Example 5: With manual connection control
 */
export const ManualControlExample: React.FC = () => {
  const { connectionStatus, error, connect, disconnect, isConnected } =
    useVesselTracking({
      autoConnect: false,
    });

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Manual Connection Control</h2>
      
      <ConnectionStatus status={connectionStatus} error={error} />

      <div className="flex gap-2">
        <button
          onClick={connect}
          disabled={isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Connect
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};
