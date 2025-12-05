/**
 * TrackedVesselsCard Component
 *
 * Displays and manages vessels that are being continuously tracked.
 * Allows users to view tracked vessels and stop tracking them.
 */

import { Radio, Ship, X, MapPin, Clock } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import type { VesselWithPosition } from '../../types';

export interface TrackedVesselInfo {
  mmsi: string;
  name?: string;
  startedAt: number;
  lastUpdate?: number;
}

interface TrackedVesselsCardProps {
  trackedVessels: TrackedVesselInfo[];
  vessels: Map<string, VesselWithPosition>;
  currentTrackingMmsi: string | null;
  onVesselClick: (mmsi: string) => void;
  onStopTracking: (mmsi: string) => void;
  onStopAllTracking?: () => void;
}

export function TrackedVesselsCard({
  trackedVessels,
  vessels,
  currentTrackingMmsi,
  onVesselClick,
  onStopTracking,
  onStopAllTracking,
}: TrackedVesselsCardProps) {
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatDuration = (startTime: number) => {
    const minutes = Math.floor((Date.now() - startTime) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  // Enrich tracked vessels with current vessel data
  const enrichedTrackedVessels = trackedVessels.map((tracked) => {
    const vessel = vessels.get(tracked.mmsi);
    return {
      ...tracked,
      vessel,
      displayName: vessel?.name || tracked.name || `Vessel ${tracked.mmsi}`,
      hasPosition: vessel?.position != null,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-eva-accent-orange animate-pulse" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-eva-text-accent">Tracked Vessels</h3>
          {trackedVessels.length > 0 && (
            <span className="text-xs bg-eva-accent-orange/10 text-eva-accent-orange px-2 py-0.5 border border-eva-accent-orange/30 uppercase tracking-wide" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
              {trackedVessels.length}
            </span>
          )}
        </div>
        {trackedVessels.length > 1 && onStopAllTracking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStopAllTracking}
            className="h-7 px-2 text-xs text-eva-text-secondary hover:text-eva-accent-red hover:bg-eva-accent-red/10 uppercase tracking-wide"
          >
            Stop All
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2 pr-2">
          {enrichedTrackedVessels.map((tracked) => {
            const isCurrentlyTracking = tracked.mmsi === currentTrackingMmsi;

            return (
              <div
                key={tracked.mmsi}
                className={`group relative flex items-center gap-3 p-3 transition-all cursor-pointer border-l-2 overflow-hidden ${
                  isCurrentlyTracking
                    ? 'bg-eva-bg-tertiary border-eva-accent-orange shadow-sm shadow-eva-accent-orange/20'
                    : 'hover:bg-eva-bg-tertiary border-transparent hover:border-eva-accent-orange'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                onClick={() => onVesselClick(tracked.mmsi)}
              >
                {/* Scan effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-eva-accent-orange/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                
                {/* Vessel Icon with Tracking Indicator */}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-colors ${
                      isCurrentlyTracking
                        ? 'bg-eva-accent-orange/20'
                        : 'bg-eva-accent-orange/10'
                    }`}
                    style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                  >
                    <Ship
                      className={`h-5 w-5 ${
                        isCurrentlyTracking ? 'text-eva-accent-orange' : 'text-eva-text-secondary'
                      }`}
                    />
                  </div>
                  {isCurrentlyTracking && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-eva-accent-green flex items-center justify-center animate-pulse" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                      <Radio className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Vessel Info */}
                <div className="flex-1 min-w-0 z-10">
                  <p className={`text-sm font-medium truncate uppercase tracking-wide ${isCurrentlyTracking ? 'text-eva-accent-orange' : 'text-eva-text-primary'}`}>{tracked.displayName}</p>
                  <div className="flex items-center gap-2 text-xs text-eva-text-secondary">
                    <span>[{tracked.mmsi}]</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-eva-text-secondary">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Tracking for {formatDuration(tracked.startedAt)}</span>
                    </div>
                    {tracked.lastUpdate && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>Updated {formatTimeAgo(tracked.lastUpdate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stop Tracking Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopTracking(tracked.mmsi);
                  }}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-eva-text-secondary hover:text-eva-accent-red hover:bg-eva-accent-red/10 z-10"
                  title="Stop tracking"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {trackedVessels.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-eva-accent-orange/10 flex items-center justify-center mx-auto mb-3" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                <Radio className="h-7 w-7 text-eva-accent-orange/50" />
              </div>
              <p className="text-sm font-medium text-eva-text-primary uppercase tracking-wide">No tracked vessels</p>
              <p className="text-xs text-eva-text-secondary mt-1 max-w-[200px] mx-auto">
                Click the "Track" button on a vessel's info panel to start continuous tracking
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Info Footer */}
      {trackedVessels.length > 0 && (
        <div className="pt-3 border-t border-eva-border-accent">
          <p className="text-xs text-eva-text-secondary text-center uppercase tracking-wide">
            Tracked vessels update every 30 minutes
          </p>
        </div>
      )}
    </div>
  );
}
