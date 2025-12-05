/**
 * TerminalCoverageDisplay Component
 * 
 * Terminal-styled coverage display with EVA aesthetics.
 * Displays data collection status, service health, and regional scheduler info.
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4
 * - Terminal window styling
 * - Monospace typography with bracketed labels
 * - Terminal color scheme integration
 * - Grid overlay for visualizations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TerminalWindow } from './TerminalWindow';
import { getSchedulerStatus, getHealthStatus, SchedulerStatus, HealthStatus } from '../../services/VesselAPI';

export interface TerminalCoverageDisplayProps {
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
  /** Whether to show expanded details by default */
  defaultExpanded?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Format time until next rotation
 */
function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return 'N/A';

  const targetTime = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = targetTime - now;

  if (diffMs <= 0) return 'SOON';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}H ${minutes}M`;
  }
  return `${minutes}M`;
}

/**
 * Format relative time for last update
 */
function formatLastUpdate(dateString: string | null): string {
  if (!dateString) return 'NEVER';

  const updateTime = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = now - updateTime;

  if (diffMs < 60000) return 'NOW';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}M AGO`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;

  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

/**
 * Terminal-styled service status row
 */
const TerminalServiceStatus: React.FC<{
  name: string;
  status: string;
}> = ({ name, status }) => {
  const getStatusIndicator = () => {
    switch (status) {
      case 'connected':
        return { symbol: '[OK]', className: 'terminal-text-success' };
      case 'disconnected':
        return { symbol: '[ERR]', className: 'terminal-text-error' };
      case 'not_configured':
        return { symbol: '[N/A]', className: 'terminal-text-dim' };
      default:
        return { symbol: '[???]', className: 'terminal-text-dim' };
    }
  };

  const { symbol, className } = getStatusIndicator();

  return (
    <div className="flex items-center justify-between terminal-mono text-xs py-0.5">
      <span className="terminal-text-dim">[{name.toUpperCase()}]:</span>
      <span className={className}>{symbol} {status.toUpperCase().replace('_', ' ')}</span>
    </div>
  );
};

/**
 * Terminal-styled data statistic row
 */
const TerminalDataStat: React.FC<{
  label: string;
  value: string | number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between terminal-mono text-xs py-0.5">
    <span className="terminal-text-dim">[{label.toUpperCase()}]:</span>
    <span className={highlight ? 'terminal-text-accent terminal-glow-subtle' : 'terminal-text'}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  </div>
);

/**
 * Terminal-styled progress bar with grid overlay
 */
const TerminalProgressBar: React.FC<{
  value: number;
  label: string;
  showGrid?: boolean;
}> = ({ value, label, showGrid = true }) => {
  const barWidth = Math.min(100, Math.max(0, value));
  const gridSegments = 10;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between terminal-mono text-xs">
        <span className="terminal-text-dim">[{label.toUpperCase()}]:</span>
        <span className="terminal-text">{value}%</span>
      </div>
      <div 
        className="relative h-3 border terminal-border"
        style={{ 
          backgroundColor: 'var(--terminal-bg)',
        }}
      >
        {/* Grid overlay - Requirement 16.4 */}
        {showGrid && (
          <div className="absolute inset-0 flex">
            {Array.from({ length: gridSegments }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 border-r terminal-border-dim last:border-r-0"
                style={{ opacity: 0.3 }}
              />
            ))}
          </div>
        )}
        {/* Progress fill */}
        <div 
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{ 
            width: `${barWidth}%`,
            backgroundColor: 'var(--terminal-accent)',
            boxShadow: `0 0 8px var(--terminal-glow)`,
          }}
        />
        {/* Scanline effect on progress bar */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Terminal-styled region list item
 */
const TerminalRegionItem: React.FC<{
  name: string;
  isActive: boolean;
  priority?: number;
}> = ({ name, isActive, priority }) => (
  <div className={`flex items-center gap-2 terminal-mono text-xs py-0.5 ${isActive ? 'terminal-text-accent terminal-glow-subtle' : 'terminal-text-dim'}`}>
    <span>{isActive ? '>' : ' '}</span>
    <span className={isActive ? 'terminal-text-accent' : 'terminal-text-dim'}>
      {name.toUpperCase()}
    </span>
    {priority && priority > 1 && (
      <span className="terminal-text-dim">(x{priority})</span>
    )}
  </div>
);

export const TerminalCoverageDisplay: React.FC<TerminalCoverageDisplayProps> = ({
  refreshInterval = 30000,
  defaultExpanded = true,
  className = '',
}) => {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [showRegions, setShowRegions] = useState(false);

  // Fetch all status data
  const fetchStatus = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    
    try {
      const [scheduler, health] = await Promise.all([
        getSchedulerStatus(),
        getHealthStatus(),
      ]);
      
      setSchedulerStatus(scheduler);
      setHealthStatus(health);
      setError(null);
      setLastFetchTime(new Date());
    } catch (err) {
      setError('FETCH FAILED');
      console.error('Error fetching status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  // Initial fetch and interval
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => fetchStatus(), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  // Calculate overall system status
  const getOverallStatus = (): string => {
    if (!healthStatus) return 'UNKNOWN';
    return healthStatus.status.toUpperCase();
  };

  // Calculate data freshness percentage
  const getDataFreshness = (): number => {
    if (!healthStatus?.dataStatus) return 0;
    const { vesselsWithPosition, vesselsWithRecentPosition } = healthStatus.dataStatus;
    if (vesselsWithPosition === 0) return 0;
    return Math.round((vesselsWithRecentPosition / vesselsWithPosition) * 100);
  };

  const overallStatus = getOverallStatus();
  const statusClass = overallStatus === 'HEALTHY' 
    ? 'terminal-text-success' 
    : overallStatus === 'DEGRADED' 
      ? 'terminal-text-accent' 
      : 'terminal-text-error';

  return (
    <TerminalWindow
      title="DATA COVERAGE"
      className={`terminal-coverage-display ${className}`}
      borderStyle="single"
    >
      <div className="terminal-scrollbar terminal-mono space-y-3">
        {/* Header with status and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="terminal-text-dim">[STATUS]:</span>
            <span className={`${statusClass} ${overallStatus === 'HEALTHY' ? 'terminal-glow-subtle' : ''}`}>
              {isLoading ? 'LOADING...' : overallStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="terminal-interactive terminal-text-dim hover:terminal-text text-xs px-1"
            >
              [{isExpanded ? '-' : '+'}]
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="terminal-interactive terminal-text-dim hover:terminal-text text-xs px-1"
            >
              [{isRefreshing ? '...' : 'REFRESH'}]
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Quick Stats with Grid */}
            {healthStatus?.dataStatus && (
              <div className="border terminal-border p-2 space-y-2">
                <div className="terminal-text-dim text-xs mb-2">--- VESSEL DATA ---</div>
                <div 
                  className="grid grid-cols-2 gap-2"
                  style={{
                    backgroundImage: 'linear-gradient(var(--terminal-dim) 1px, transparent 1px), linear-gradient(90deg, var(--terminal-dim) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '-1px -1px',
                    opacity: 0.95,
                  }}
                >
                  <div className="text-center p-2" style={{ backgroundColor: 'var(--terminal-bg)' }}>
                    <div className="terminal-text text-lg terminal-glow-subtle">
                      {healthStatus.dataStatus.totalVessels.toLocaleString()}
                    </div>
                    <div className="terminal-text-dim text-xs">[TOTAL]</div>
                  </div>
                  <div className="text-center p-2" style={{ backgroundColor: 'var(--terminal-bg)' }}>
                    <div className="terminal-text-accent text-lg terminal-glow-subtle">
                      {healthStatus.dataStatus.vesselsWithRecentPosition.toLocaleString()}
                    </div>
                    <div className="terminal-text-dim text-xs">[ACTIVE &lt;1H]</div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Freshness Progress */}
            {healthStatus?.dataStatus && (
              <TerminalProgressBar 
                value={getDataFreshness()} 
                label="DATA FRESHNESS"
                showGrid={true}
              />
            )}

            {/* Service Status */}
            {healthStatus?.services && (
              <div className="border terminal-border p-2">
                <div className="terminal-text-dim text-xs mb-2">--- SERVICES ---</div>
                <TerminalServiceStatus name="DATABASE" status={healthStatus.services.database} />
                <TerminalServiceStatus name="CACHE" status={healthStatus.services.redis} />
                <TerminalServiceStatus name="AIS STREAM" status={healthStatus.services.aisStream} />
              </div>
            )}

            {/* Data Statistics */}
            {healthStatus?.dataStatus && (
              <div className="border terminal-border p-2">
                <div className="terminal-text-dim text-xs mb-2">--- STATISTICS ---</div>
                <TerminalDataStat
                  label="POS REPORTS 24H"
                  value={healthStatus.dataStatus.positionReportsLast24h}
                />
                <TerminalDataStat
                  label="LAST UPDATE"
                  value={formatLastUpdate(healthStatus.dataStatus.lastPositionUpdate)}
                  highlight={
                    healthStatus.dataStatus.lastPositionUpdate
                      ? Date.now() - new Date(healthStatus.dataStatus.lastPositionUpdate).getTime() < 300000
                      : false
                  }
                />
              </div>
            )}

            {/* Regional Scheduler */}
            {schedulerStatus && (
              <div className="border terminal-border p-2 space-y-2">
                <div className="terminal-text-dim text-xs mb-2">--- REGIONAL COLLECTION ---</div>
                
                <TerminalDataStat
                  label="CURRENT REGION"
                  value={schedulerStatus.currentRegion?.name?.toUpperCase() || 'UNKNOWN'}
                  highlight={true}
                />

                <TerminalProgressBar 
                  value={schedulerStatus.cycleProgress} 
                  label="CYCLE PROGRESS"
                  showGrid={true}
                />

                <div className="terminal-mono text-xs">
                  <span className="terminal-text-dim">[REGIONS]:</span>
                  <span className="terminal-text ml-2">
                    {schedulerStatus.regionsCompleted}/{schedulerStatus.totalRegions}
                  </span>
                </div>

                <div className="terminal-mono text-xs">
                  <span className="terminal-text-dim">[NEXT]:</span>
                  <span className="terminal-text ml-2">
                    {schedulerStatus.nextRegion?.name?.toUpperCase() || 'UNKNOWN'} IN {formatTimeUntil(schedulerStatus.nextRotationTime)}
                  </span>
                </div>

                {/* Region list toggle */}
                <button
                  onClick={() => setShowRegions(!showRegions)}
                  className="terminal-interactive terminal-text-dim hover:terminal-text text-xs w-full text-left"
                >
                  [{showRegions ? '-' : '+'}] VIEW ALL REGIONS ({schedulerStatus.regions?.length || 0})
                </button>

                {showRegions && schedulerStatus.regions && (
                  <div className="border-t terminal-border-dim pt-2 mt-2 max-h-32 overflow-y-auto terminal-scrollbar-thin">
                    {schedulerStatus.regions.map((region) => (
                      <TerminalRegionItem
                        key={region.id}
                        name={region.name}
                        isActive={region.id === schedulerStatus.currentRegion?.id}
                        priority={region.priority}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last Refresh Info */}
            <div className="flex items-center justify-between terminal-mono text-xs pt-2 border-t terminal-border-dim">
              <span className="terminal-text-dim">
                [UPDATED]: {lastFetchTime ? formatLastUpdate(lastFetchTime.toISOString()) : 'NEVER'}
              </span>
            </div>

            {/* Error message */}
            {error && (
              <div className="border terminal-border p-2">
                <span className="terminal-text-error text-xs">[ERROR]: {error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </TerminalWindow>
  );
};

export default TerminalCoverageDisplay;
