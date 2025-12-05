/**
 * EmptyMapState Component - Display prompt when no vessels are loaded
 *
 * Shows a clean empty state guiding users to search or define an area
 * without displaying error messages. Also provides information about
 * position data collection and troubleshooting guidance.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React from 'react';
import { API_CONFIG } from '../config';

/**
 * Props for EmptyMapState component
 */
export interface EmptyMapStateProps {
  /** Optional custom message to display */
  message?: string;
  /** Whether to show troubleshooting guidance for administrators */
  showTroubleshooting?: boolean;
}

/**
 * EmptyMapState Component
 *
 * Displays a centered prompt on the map when no vessels are loaded,
 * guiding users to take action to view vessel data. Includes information
 * about position data collection and links to system health status.
 */
export const EmptyMapState: React.FC<EmptyMapStateProps> = ({
  message = 'No vessels loaded',
  showTroubleshooting = true,
}) => {
  const healthEndpoint = `${API_CONFIG.baseUrl}/api/health`;

  return (
    <div
      className="empty-map-state absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-bg-primary/95 backdrop-blur-sm border-2 border-border shadow-2xl px-12 py-8 rounded-lg text-center max-w-md"
    >
      <div className="text-3xl mb-4 font-mono text-eva-accent-orange">
        [MAP]
      </div>
      <h3 className="mb-3 text-xl font-semibold text-text-primary">
        {message}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Use the search and filter options in the sidebar to find vessels, or
        define an area of interest to start tracking.
      </p>
      
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-text-secondary leading-relaxed mb-3">
          <strong className="text-text-primary">Position data is being collected.</strong>
          <br />
          Vessels will appear on the map as AIS position reports are received and processed.
        </p>
        
        {showTroubleshooting && (
          <div className="mt-4 p-4 bg-bg-secondary rounded border border-border text-left">
            <p className="text-xs font-semibold text-text-primary mb-2">
              Troubleshooting for Administrators:
            </p>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>Verify the AIS stream connection is active</li>
              <li>Check that position reports are being received</li>
              <li>Ensure the data pipeline is processing messages</li>
            </ul>
            <a
              href={healthEndpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-blue-500 hover:text-blue-600 underline"
            >
              View System Health Status →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
