import React from 'react';
import { useVesselTracking } from '../hooks/useVesselTracking';
import { ErrorDisplay } from './ErrorDisplay';
import { ConnectionStatus } from './ConnectionStatus';
import type { VesselWithPosition } from '../types';

/**
 * Integration example showing ErrorDisplay with useVesselTracking hook
 * 
 * This demonstrates how to use ErrorDisplay in a real application
 * to handle connection errors and display user-friendly messages.
 */
export const VesselTrackingWithErrorHandling: React.FC = () => {
  const { connectionStatus, error } = useVesselTracking();
  const [dismissedError, setDismissedError] = React.useState(false);
  const [vessels] = React.useState<VesselWithPosition[]>([]);

  // Show error display when there's an error and it hasn't been dismissed
  const showError = error && !dismissedError;

  // Reset dismissed state when error changes
  React.useEffect(() => {
    if (error) {
      setDismissedError(false);
    }
  }, [error]);

  return (
    <div className="p-4 space-y-4">
      {/* Connection Status Indicator */}
      <div className="flex justify-end">
        <ConnectionStatus status={connectionStatus} error={error} />
      </div>

      {/* Error Display for Connection Errors */}
      {showError && connectionStatus === 'error' && (
        <ErrorDisplay
          message="Failed to connect to vessel tracking service"
          type="connection"
          details={error.message}
          severity="error"
          onDismiss={() => setDismissedError(true)}
        />
      )}

      {/* Warning for Disconnected State */}
      {connectionStatus === 'disconnected' && !error && (
        <ErrorDisplay
          message="Connection lost"
          type="connection"
          details="Attempting to reconnect..."
          severity="warning"
          showTroubleshooting={true}
        />
      )}

      {/* Info for Connecting State */}
      {connectionStatus === 'connecting' && (
        <ErrorDisplay
          message="Connecting to vessel tracking service..."
          type="connection"
          severity="info"
          showTroubleshooting={false}
        />
      )}

      {/* Vessel List */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">
          Active Vessels ({vessels.length})
        </h2>
        {vessels.length === 0 ? (
          <p className="text-gray-500">No vessels available</p>
        ) : (
          <ul className="space-y-2">
            {vessels.map((vessel: VesselWithPosition) => (
              <li key={vessel.mmsi} className="border-b pb-2">
                <div className="font-medium">{vessel.name || 'Unknown'}</div>
                <div className="text-sm text-gray-600">MMSI: {vessel.mmsi}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * Example with database error handling
 */
export const VesselDataWithDatabaseError: React.FC = () => {
  const [databaseError, setDatabaseError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchVesselData = async () => {
    setLoading(true);
    setDatabaseError(null);

    try {
      const response = await fetch('/api/vessels');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      await response.json();
      // Process data...
    } catch (err) {
      setDatabaseError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchVesselData();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Database Error Display */}
      {databaseError && (
        <ErrorDisplay
          message="Failed to load vessel data"
          type="database"
          details={databaseError.message}
          severity="error"
          onDismiss={() => setDatabaseError(null)}
        />
      )}

      {/* Loading State */}
      {loading && (
        <ErrorDisplay
          message="Loading vessel data..."
          type="api"
          severity="info"
          showTroubleshooting={false}
        />
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Vessel Data</h2>
        {/* Vessel data display */}
      </div>
    </div>
  );
};

/**
 * Example with API error handling
 */
export const VesselSearchWithValidation: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setValidationError(null);

    // Validate MMSI format (9 digits)
    if (query && !/^\d{9}$/.test(query)) {
      setValidationError('MMSI must be exactly 9 digits');
      return;
    }

    // Perform search...
  };

  return (
    <div className="p-4 space-y-4">
      {/* Validation Error Display */}
      {validationError && (
        <ErrorDisplay
          message="Invalid search input"
          type="validation"
          details={validationError}
          severity="error"
          onDismiss={() => setValidationError(null)}
        />
      )}

      {/* Search Input */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search by MMSI
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Enter 9-digit MMSI"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default VesselTrackingWithErrorHandling;
