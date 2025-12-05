/**
 * FleetStatusCard Component
 *
 * Displays a summary of fleet navigational status distribution.
 * Shows counts for different vessel states (underway, anchored, moored, etc.)
 */

import { useMemo } from 'react';
import { Ship, Anchor, Link2, Fish, AlertTriangle, AlertCircle, Navigation } from 'lucide-react';
import { VesselWithPosition } from '../../types';
import { getFleetStatusSummary, getNavStatusInfo, NavigationalStatus } from '../../utils/navigationUtils';
import { EvaCounter } from '../ui/eva-effects';

interface FleetStatusCardProps {
  vessels: Map<string, VesselWithPosition>;
}

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  total: number;
}

const StatusItem: React.FC<StatusItemProps> = ({ icon, label, count, color, total }) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  
  if (count === 0) return null;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-eva-bg-tertiary transition-colors border-l-2 border-transparent hover:border-eva-accent-orange" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 flex items-center justify-center`} style={{ backgroundColor: `${color}20`, clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
          {icon}
        </div>
        <span className="text-sm font-medium text-eva-text-primary uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>
          <EvaCounter value={count} duration={800} />
        </span>
        <span className="text-xs text-eva-text-secondary">({percentage}%)</span>
      </div>
    </div>
  );
};

export function FleetStatusCard({ vessels }: FleetStatusCardProps) {
  const summary = useMemo(() => {
    const vesselsArray = Array.from(vessels.values());
    return getFleetStatusSummary(vesselsArray);
  }, [vessels]);

  // Get critical alerts (vessels not under command, aground, etc.)
  const criticalVessels = useMemo(() => {
    return Array.from(vessels.values()).filter(v => {
      const status = v.position?.navigational_status;
      return status === NavigationalStatus.NOT_UNDER_COMMAND || 
             status === NavigationalStatus.AGROUND ||
             status === NavigationalStatus.AIS_SART;
    });
  }, [vessels]);

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {criticalVessels.length > 0 && (
        <div className="p-3 bg-eva-accent-red/10 border-2 border-eva-accent-red animate-pulse" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-eva-accent-red" />
            <span className="font-semibold text-eva-accent-red uppercase tracking-wider">Critical Alerts</span>
          </div>
          <div className="space-y-1">
            {criticalVessels.slice(0, 3).map(vessel => {
              const statusInfo = getNavStatusInfo(vessel.position?.navigational_status);
              return (
                <div key={vessel.mmsi} className="text-sm flex items-center gap-2 text-eva-text-primary">
                  <span>{statusInfo.icon}</span>
                  <span className="font-medium truncate uppercase tracking-wide">{vessel.name || vessel.mmsi}</span>
                  <span className="text-eva-accent-red text-xs">- {statusInfo.shortName}</span>
                </div>
              );
            })}
            {criticalVessels.length > 3 && (
              <p className="text-xs text-eva-accent-red uppercase tracking-wide">+{criticalVessels.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="space-y-1">
        <StatusItem
          icon={<Ship className="w-4 h-4 text-emerald-500" />}
          label="Underway"
          count={summary.underway}
          color="#10B981"
          total={summary.total}
        />
        <StatusItem
          icon={<Anchor className="w-4 h-4 text-blue-500" />}
          label="At Anchor"
          count={summary.anchored}
          color="#3B82F6"
          total={summary.total}
        />
        <StatusItem
          icon={<Link2 className="w-4 h-4 text-gray-500" />}
          label="Moored"
          count={summary.moored}
          color="#6B7280"
          total={summary.total}
        />
        <StatusItem
          icon={<Fish className="w-4 h-4 text-emerald-500" />}
          label="Fishing"
          count={summary.fishing}
          color="#10B981"
          total={summary.total}
        />
        <StatusItem
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          label="Restricted"
          count={summary.restricted}
          color="#F59E0B"
          total={summary.total}
        />
        <StatusItem
          icon={<AlertCircle className="w-4 h-4 text-red-500" />}
          label="Not Under Command"
          count={summary.notUnderCommand}
          color="#EF4444"
          total={summary.total}
        />
        <StatusItem
          icon={<Navigation className="w-4 h-4 text-gray-400" />}
          label="Other/Unknown"
          count={summary.other}
          color="#9CA3AF"
          total={summary.total}
        />
      </div>

      {/* Visual Bar */}
      <div className="mt-4">
        <div className="h-3 overflow-hidden flex bg-eva-bg-tertiary border border-eva-border-default" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
          {summary.underway > 0 && (
            <div 
              className="h-full bg-eva-accent-green" 
              style={{ width: `${(summary.underway / summary.total) * 100}%` }}
              title={`Underway: ${summary.underway}`}
            />
          )}
          {summary.anchored > 0 && (
            <div 
              className="h-full bg-eva-accent-cyan" 
              style={{ width: `${(summary.anchored / summary.total) * 100}%` }}
              title={`Anchored: ${summary.anchored}`}
            />
          )}
          {summary.moored > 0 && (
            <div 
              className="h-full bg-eva-text-secondary" 
              style={{ width: `${(summary.moored / summary.total) * 100}%` }}
              title={`Moored: ${summary.moored}`}
            />
          )}
          {summary.fishing > 0 && (
            <div 
              className="h-full bg-eva-accent-green" 
              style={{ width: `${(summary.fishing / summary.total) * 100}%` }}
              title={`Fishing: ${summary.fishing}`}
            />
          )}
          {(summary.restricted + summary.notUnderCommand + summary.aground) > 0 && (
            <div 
              className="h-full bg-eva-accent-orange" 
              style={{ width: `${((summary.restricted + summary.notUnderCommand + summary.aground) / summary.total) * 100}%` }}
              title={`Restricted/Alert: ${summary.restricted + summary.notUnderCommand + summary.aground}`}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-eva-text-secondary uppercase tracking-wide">
          <span>Total: <EvaCounter value={summary.total} duration={800} /> vessels</span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-eva-accent-green" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />Underway</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-eva-accent-cyan" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />Anchored</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-eva-text-secondary" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />Moored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
