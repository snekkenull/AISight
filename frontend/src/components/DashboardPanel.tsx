/**
 * DashboardPanel Component
 *
 * Left dock with icon navigation and floating cards.
 * Features:
 * - Search with integrated recent searches
 * - Vessel list
 * - Tracked vessels management
 * - Weather/Sea state
 * - Data collection coverage
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Ship, Radio, Cloud, X, Globe, Activity } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import { Button } from './ui/button';
import { SearchCard, RecentVesselEntry } from './cards/SearchCard';
import { VesselListCard } from './cards/VesselListCard';
import { TrackedVesselsCard, TrackedVesselInfo } from './cards/TrackedVesselsCard';
import { WeatherCard } from './cards/WeatherCard';
import { FleetStatusCard } from './cards/FleetStatusCard';
import { RegionStatusIndicator } from './RegionStatusIndicator';
import type { VesselWithPosition, SearchFilterCriteria } from '../types';

export type CardType = 'search' | 'vesselList' | 'trackedVessels' | 'fleetStatus' | 'weather' | 'dataCollection';

interface DashboardPanelProps {
  vessels: VesselWithPosition[];
  allVessels: Map<string, VesselWithPosition>;
  selectedVesselMmsi: string | null;
  onVesselClick: (mmsi: string) => void;
  onFilterChange: (criteria: SearchFilterCriteria) => void;
  totalVessels: number;
  filteredVessels: number;
  searchQuery: string;
  mapCenter?: { lat: number; lon: number };
  // Tracking props
  trackedVesselMmsi: string | null;
  trackedVessels: TrackedVesselInfo[];
  onStopTracking: (mmsi: string) => void;
  onStopAllTracking?: () => void;
}

const CARD_ICONS = {
  search: Search,
  vesselList: Ship,
  trackedVessels: Radio,
  fleetStatus: Activity,
  weather: Cloud,
  dataCollection: Globe,
};

const CARD_LABELS = {
  search: 'Search',
  vesselList: 'Vessels',
  trackedVessels: 'Tracking',
  fleetStatus: 'Fleet Status',
  weather: 'Sea State',
  dataCollection: 'Coverage',
};

export function DashboardPanel({
  vessels,
  allVessels,
  selectedVesselMmsi,
  onVesselClick,
  onFilterChange,
  totalVessels,
  filteredVessels,
  searchQuery,
  mapCenter,
  trackedVesselMmsi,
  trackedVessels,
  onStopTracking,
  onStopAllTracking,
}: DashboardPanelProps) {
  const [activeCard, setActiveCard] = usePersistedState<CardType | null>('dashboard-active-card', null);
  const [cardHeight, setCardHeight] = usePersistedState('dashboard-card-height', 500);
  const [recentVessels, setRecentVessels] = usePersistedState<RecentVesselEntry[]>(
    'recent-vessels-v2',
    []
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Add vessel to recent list
  const addRecentVessel = useCallback(
    (mmsi: string, name?: string, source: 'manual' | 'ai' = 'manual') => {
      setRecentVessels((prev) => {
        // Remove existing entry for this MMSI
        const filtered = prev.filter((entry) => entry.mmsi !== mmsi);
        // Add new entry at the beginning
        const newEntry: RecentVesselEntry = {
          mmsi,
          name,
          timestamp: Date.now(),
          source,
        };
        return [newEntry, ...filtered].slice(0, 20); // Keep last 20 entries
      });
    },
    [setRecentVessels]
  );

  // Expose addRecentVessel for AI callbacks via window
  useEffect(() => {
    (window as unknown as { addRecentVessel: typeof addRecentVessel }).addRecentVessel =
      addRecentVessel;
    return () => {
      delete (window as unknown as { addRecentVessel?: typeof addRecentVessel }).addRecentVessel;
    };
  }, [addRecentVessel]);

  const handleVesselClick = (mmsi: string) => {
    const vessel = vessels.find((v) => v.mmsi === mmsi) || allVessels.get(mmsi);
    addRecentVessel(mmsi, vessel?.name, 'manual');
    onVesselClick(mmsi);
  };

  const handleRemoveRecentEntry = useCallback(
    (mmsi: string) => {
      setRecentVessels((prev) => prev.filter((entry) => entry.mmsi !== mmsi));
    },
    [setRecentVessels]
  );

  const handleClearAllRecent = useCallback(() => {
    setRecentVessels([]);
  }, [setRecentVessels]);

  const handleIconClick = (type: CardType) => {
    setActiveCard(activeCard === type ? null : type);
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startY: e.clientY, startHeight: cardHeight };
    },
    [cardHeight]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY;
      const newHeight = Math.max(200, Math.min(800, resizeRef.current.startHeight + delta));
      setCardHeight(newHeight);
    },
    [isResizing, setCardHeight]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Convert vessels array to array for SearchCard
  const vesselsArray = Array.from(allVessels.values());

  return (
    <>
      {/* Icon Dock - EVA Styled */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[1001] flex flex-col gap-1 p-2 bg-eva-bg-secondary/95 backdrop-blur-md border-r-2 border-eva-border-accent shadow-eva-glow-orange eva-clip-corner">
        {/* Corner bracket decorations */}
        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-eva-accent-orange" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-eva-accent-orange" />
        
        {(Object.keys(CARD_ICONS) as CardType[]).map((type) => {
          const Icon = CARD_ICONS[type];
          const hasNotification = type === 'trackedVessels' && trackedVessels.length > 0;

          return (
            <Button
              key={type}
              variant={activeCard === type ? 'eva-primary' : 'ghost'}
              size="icon"
              onClick={() => handleIconClick(type)}
              className={`relative group min-w-[44px] min-h-[44px] transition-all hover:scale-110 ${
                activeCard === type 
                  ? 'bg-eva-accent-orange/20 border border-eva-accent-orange shadow-eva-glow-sm' 
                  : 'hover:bg-eva-bg-tertiary hover:shadow-eva-glow-sm'
              }`}
              title={CARD_LABELS[type]}
            >
              <Icon
                className={`h-5 w-5 ${
                  activeCard === type ? 'text-eva-accent-orange' : 'text-eva-text-secondary'
                } ${type === 'trackedVessels' && trackedVessels.length > 0 ? 'animate-eva-pulse' : ''}`}
              />
              {/* Notification badge for tracked vessels */}
              {hasNotification && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-eva-accent-orange text-eva-bg-primary text-[10px] font-bold rounded-sm flex items-center justify-center animate-eva-pulse">
                  {trackedVessels.length}
                </span>
              )}
              <span className="absolute left-full ml-2 px-2 py-1 bg-eva-bg-tertiary text-eva-text-primary text-xs eva-clip-corner-sm border border-eva-border-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-eva-glow-sm">
                {CARD_LABELS[type]}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Floating Card - EVA Styled */}
      {activeCard && (
        <div
          className="fixed left-16 top-1/2 -translate-y-1/2 z-[1000] w-96 bg-eva-bg-secondary/95 backdrop-blur-xl border-2 border-eva-border-accent shadow-eva-glow-orange eva-clip-corner overflow-hidden animate-in slide-in-from-left-5 duration-300"
          style={{ height: `${cardHeight}px` }}
        >
          {/* Corner bracket decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-eva-accent-orange z-10" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-eva-accent-orange z-10" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-eva-accent-orange z-10" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-eva-accent-orange z-10" />
          
          {/* Resize Handle - Top */}
          <div
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-eva-accent-orange/50 transition-colors group z-20"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-eva-border-default group-hover:bg-eva-accent-orange transition-colors" />
          </div>

          {/* Card Header - EVA Styled with warning stripe pattern */}
          <div className="relative">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-eva-bg-tertiary to-eva-bg-secondary relative overflow-hidden">
              {/* Warning stripe pattern background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, var(--eva-accent-orange) 0px, var(--eva-accent-orange) 10px, transparent 10px, transparent 20px)',
              }} />
              
              <div className="flex items-center gap-2 relative z-10">
                {(() => {
                  const Icon = CARD_ICONS[activeCard];
                  return <Icon className="h-5 w-5 text-eva-accent-orange" />;
                })()}
                <h3 className="font-semibold text-eva-text-primary uppercase tracking-eva-wide font-eva-display text-sm">
                  {CARD_LABELS[activeCard]}
                </h3>
                {activeCard === 'trackedVessels' && trackedVessels.length > 0 && (
                  <span className="text-xs bg-eva-accent-orange/20 text-eva-accent-orange px-2 py-0.5 border border-eva-accent-orange/50 eva-clip-corner-sm font-eva-mono">
                    {trackedVessels.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveCard(null)}
                className="h-8 w-8 hover:bg-eva-bg-tertiary hover:text-eva-accent-orange transition-all relative z-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Angular divider/underline */}
            <div className="h-0.5 bg-eva-border-accent relative">
              <div className="absolute left-0 top-0 w-12 h-full bg-eva-accent-orange shadow-eva-glow-sm" />
              <div className="absolute right-0 top-0 w-8 h-full bg-eva-accent-orange/50" />
            </div>
          </div>

          {/* Card Content */}
          <div className="overflow-y-auto p-4 bg-eva-bg-primary/50" style={{ height: `${cardHeight - 65}px` }}>
            {activeCard === 'search' && (
              <SearchCard
                onFilterChange={onFilterChange}
                onVesselClick={handleVesselClick}
                totalVessels={totalVessels}
                filteredVessels={filteredVessels}
                recentEntries={recentVessels}
                vessels={vesselsArray}
                onRemoveRecentEntry={handleRemoveRecentEntry}
                onClearAllRecent={handleClearAllRecent}
              />
            )}
            {activeCard === 'vesselList' && (
              <VesselListCard
                vessels={vessels}
                selectedVesselMmsi={selectedVesselMmsi}
                onVesselClick={handleVesselClick}
                searchQuery={searchQuery}
              />
            )}
            {activeCard === 'trackedVessels' && (
              <TrackedVesselsCard
                trackedVessels={trackedVessels}
                vessels={allVessels}
                currentTrackingMmsi={trackedVesselMmsi}
                onVesselClick={handleVesselClick}
                onStopTracking={onStopTracking}
                onStopAllTracking={onStopAllTracking}
              />
            )}
            {activeCard === 'fleetStatus' && (
              <FleetStatusCard vessels={allVessels} />
            )}
            {activeCard === 'weather' && (
              <WeatherCard latitude={mapCenter?.lat} longitude={mapCenter?.lon} />
            )}
            {activeCard === 'dataCollection' && <RegionStatusIndicator defaultExpanded={true} />}
          </div>

          {/* Resize Handle - Bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-eva-accent-orange/50 transition-colors group z-20"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-eva-border-default group-hover:bg-eva-accent-orange transition-colors" />
          </div>
        </div>
      )}
    </>
  );
}
