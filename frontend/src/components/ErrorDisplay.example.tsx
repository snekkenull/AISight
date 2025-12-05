import React, { useState } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

/**
 * Example usage of ErrorDisplay component
 * 
 * This file demonstrates various use cases and configurations
 * of the ErrorDisplay component.
 */
export const ErrorDisplayExample: React.FC = () => {
  const [showConnectionError, setShowConnectionError] = useState(true);
  const [showDatabaseError, setShowDatabaseError] = useState(true);
  const [showApiError, setShowApiError] = useState(true);
  const [showValidationError, setShowValidationError] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        ErrorDisplay Component Examples
      </h1>

      {/* Connection Error */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Connection Error
        </h2>
        {showConnectionError && (
          <ErrorDisplay
            message="Failed to connect to server"
            type="connection"
            details="WebSocket connection refused at ws://localhost:3000"
            severity="error"
            onDismiss={() => setShowConnectionError(false)}
          />
        )}
        {!showConnectionError && (
          <button
            onClick={() => setShowConnectionError(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Connection Error
          </button>
        )}
      </div>

      {/* Database Error */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Database Error
        </h2>
        {showDatabaseError && (
          <ErrorDisplay
            message="Database connection failed"
            type="database"
            details="Unable to retrieve vessel data from PostgreSQL"
            severity="error"
            onDismiss={() => setShowDatabaseError(false)}
          />
        )}
        {!showDatabaseError && (
          <button
            onClick={() => setShowDatabaseError(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Database Error
          </button>
        )}
      </div>

      {/* API Error */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          API Error
        </h2>
        {showApiError && (
          <ErrorDisplay
            message="Failed to fetch vessel data"
            type="api"
            details="GET /api/vessels returned 500 Internal Server Error"
            severity="error"
            onDismiss={() => setShowApiError(false)}
          />
        )}
        {!showApiError && (
          <button
            onClick={() => setShowApiError(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show API Error
          </button>
        )}
      </div>

      {/* Validation Error */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Validation Error
        </h2>
        {showValidationError && (
          <ErrorDisplay
            message="Invalid search criteria"
            type="validation"
            details="MMSI must be a 9-digit number"
            severity="error"
            onDismiss={() => setShowValidationError(false)}
          />
        )}
        {!showValidationError && (
          <button
            onClick={() => setShowValidationError(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Validation Error
          </button>
        )}
      </div>

      {/* Warning */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Warning Message
        </h2>
        {showWarning && (
          <ErrorDisplay
            message="Connection is slow"
            type="connection"
            details="High latency detected (>2000ms)"
            severity="warning"
            onDismiss={() => setShowWarning(false)}
          />
        )}
        {!showWarning && (
          <button
            onClick={() => setShowWarning(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Warning
          </button>
        )}
      </div>

      {/* Info */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Info Message
        </h2>
        {showInfo && (
          <ErrorDisplay
            message="Reconnecting to server..."
            type="connection"
            severity="info"
            showTroubleshooting={false}
            onDismiss={() => setShowInfo(false)}
          />
        )}
        {!showInfo && (
          <button
            onClick={() => setShowInfo(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Info
          </button>
        )}
      </div>

      {/* Error without dismiss button */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Error Without Dismiss Button
        </h2>
        <ErrorDisplay
          message="Critical system error - cannot be dismissed"
          type="unknown"
          details="System requires restart"
          severity="error"
          // No onDismiss prop
        />
      </div>

      {/* Error without troubleshooting */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Error Without Troubleshooting Steps
        </h2>
        <ErrorDisplay
          message="Simple error message"
          type="connection"
          severity="error"
          showTroubleshooting={false}
          onDismiss={() => {}}
        />
      </div>

      {/* Custom styled error */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Custom Styled Error
        </h2>
        <ErrorDisplay
          message="Custom styled error"
          type="connection"
          severity="error"
          className="max-w-2xl mx-auto"
          onDismiss={() => {}}
        />
      </div>
    </div>
  );
};

export default ErrorDisplayExample;
