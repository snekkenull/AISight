/**
 * RegionStatusIndicator Component
 *
 * Displays comprehensive data collection status including:
 * - Regional scheduler status (current region, cycle progress)
 * - Data pipeline health (database, cache, AIS stream)
 * - Real-time data statistics (vessel counts, position freshness)
 * - Last update timestamps for efficient data monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Database,
  Radio,
  Server,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { getSchedulerStatus, getHealthStatus, SchedulerStatus, HealthStatus } from '../services/VesselAPI';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export interface RegionStatusIndicatorProps {
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
  /** Whether to show expanded details by default */
  defaultExpanded?: boolean;
}

/**
 * Format time until next rotation
 */
function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return 'N/A';

  const targetTime = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = targetTime - now;

  if (diffMs <= 0) return 'Soon';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format relative time for last update
 */
function formatLastUpdate(dateString: string | null): string {
  if (!dateString) return 'Never';

  const updateTime = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = now - updateTime;

  if (diffMs < 60000) return 'Just now';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Service status indicator component
 */
const ServiceStatus: React.FC<{
  name: string;
  status: string;
  icon: React.ReactNode;
}> = ({ name, status, icon }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-emerald-500';
      case 'disconnected':
        return 'text-red-500';
      case 'not_configured':
        return 'text-gray-400';
      default:
        return 'text-yellow-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'disconnected':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'not_configured':
        return <AlertCircle className="w-3 h-3 text-gray-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={getStatusColor()}>{icon}</span>
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <span className={`text-xs capitalize ${getStatusColor()}`}>
          {status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};

/**
 * Data statistic item component
 */
const DataStat: React.FC<{
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}> = ({ label, value, subValue, highlight }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="text-right">
      <span className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {subValue && (
        <span className="text-[10px] text-muted-foreground ml-1">({subValue})</span>
      )}
    </div>
  </div>
);

export const RegionStatusIndicator: React.FC<RegionStatusIndicatorProps> = ({
  refreshInterval = 30000,
  defaultExpanded = false,
}) => {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

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
      setError('Failed to fetch status');
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
  const getOverallStatus = (): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' => {
    if (!healthStatus) return 'unknown';
    return healthStatus.status;
  };

  const overallStatus = getOverallStatus();

  // Get status badge variant
  const getStatusBadgeVariant = () => {
    switch (overallStatus) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Calculate data freshness percentage
  const getDataFreshness = (): number => {
    if (!healthStatus?.dataStatus) return 0;
    const { vesselsWithPosition, vesselsWithRecentPosition } = healthStatus.dataStatus;
    if (vesselsWithPosition === 0) return 0;
    return Math.round((vesselsWithRecentPosition / vesselsWithPosition) * 100);
  };

  return (
    <div className="region-status-indicator bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle data collection status details"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Data Coverage</span>
          {!isLoading && (
            <Badge variant={getStatusBadgeVariant()} className="text-xs capitalize">
              {overallStatus}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(isLoading || isRefreshing) && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-border">
          {/* Quick Stats Summary */}
          {healthStatus?.dataStatus && (
            <div className="pt-3 grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">
                  {healthStatus.dataStatus.totalVessels.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">Total Vessels</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-primary">
                  {healthStatus.dataStatus.vesselsWithRecentPosition.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">Active ({"<"}1h)</p>
              </div>
            </div>
          )}

          {/* Data Freshness Bar */}
          {healthStatus?.dataStatus && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Data Freshness</span>
                <span>{getDataFreshness()}% recent</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${getDataFreshness()}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {healthStatus.dataStatus.vesselsWithRecentPosition.toLocaleString()} of{' '}
                {healthStatus.dataStatus.vesselsWithPosition.toLocaleString()} vessels with recent positions
              </p>
            </div>
          )}

          {/* Service Status */}
          {healthStatus?.services && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground mb-2">Service Status</p>
              <ServiceStatus
                name="Database"
                status={healthStatus.services.database}
                icon={<Database className="w-3.5 h-3.5" />}
              />
              <ServiceStatus
                name="Cache (Redis)"
                status={healthStatus.services.redis}
                icon={<Server className="w-3.5 h-3.5" />}
              />
              <ServiceStatus
                name="AIS Stream"
                status={healthStatus.services.aisStream}
                icon={<Radio className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          {/* Data Statistics */}
          {healthStatus?.dataStatus && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground mb-2">Data Statistics</p>
              <DataStat
                label="Position Reports (24h)"
                value={healthStatus.dataStatus.positionReportsLast24h}
              />
              <DataStat
                label="Last Position Update"
                value={formatLastUpdate(healthStatus.dataStatus.lastPositionUpdate)}
                highlight={
                  healthStatus.dataStatus.lastPositionUpdate
                    ? Date.now() - new Date(healthStatus.dataStatus.lastPositionUpdate).getTime() < 300000
                    : false
                }
              />
            </div>
          )}

          {/* Regional Scheduler Status */}
          {schedulerStatus && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground mb-2">Regional Collection</p>
              
              {/* Current region */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Current Region</span>
                <span className="text-xs font-medium text-foreground">
                  {schedulerStatus.currentRegion?.name || 'Unknown'}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Cycle Progress</span>
                  <span>{schedulerStatus.cycleProgress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${schedulerStatus.cycleProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {schedulerStatus.regionsCompleted} of {schedulerStatus.totalRegions} regions
                </p>
              </div>

              {/* Next rotation */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  Next: {schedulerStatus.nextRegion?.name || 'Unknown'} in{' '}
                  {formatTimeUntil(schedulerStatus.nextRotationTime)}
                </span>
              </div>

              {/* Region list (collapsed by default) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  View all regions ({schedulerStatus.regions?.length || 0})
                </summary>
                <ul className="mt-2 space-y-1 pl-4 max-h-32 overflow-y-auto">
                  {schedulerStatus.regions?.map((region) => (
                    <li
                      key={region.id}
                      className={`flex items-center gap-2 ${
                        region.id === schedulerStatus.currentRegion?.id
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          region.id === schedulerStatus.currentRegion?.id
                            ? 'bg-primary animate-pulse'
                            : 'bg-muted-foreground/30'
                        }`}
                      />
                      <span className="truncate">{region.name}</span>
                      {region.priority > 1 && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          (×{region.priority})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* Last Refresh Info & Manual Refresh */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              Updated {lastFetchTime ? formatLastUpdate(lastFetchTime.toISOString()) : 'never'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
