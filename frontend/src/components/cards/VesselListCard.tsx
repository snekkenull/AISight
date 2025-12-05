import { useState, useMemo } from 'react';
import { Ship, Navigation, Gauge, MapPin, ChevronDown, Filter } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import type { VesselWithPosition } from '../../types';
import { formatSpeed, formatCourse } from '../../utils/formatters';

interface VesselListCardProps {
  vessels: VesselWithPosition[];
  selectedVesselMmsi: string | null;
  onVesselClick: (mmsi: string) => void;
  searchQuery: string;
}

type SortOption = 'name' | 'speed' | 'distance';

// Get vessel type color based on AIS type code - EVA palette
const getVesselTypeColor = (type?: number) => {
  if (!type) return 'bg-eva-text-secondary';
  if (type >= 70 && type <= 79) return 'bg-eva-accent-green'; // Cargo
  if (type >= 80 && type <= 89) return 'bg-eva-accent-red'; // Tanker
  if (type >= 60 && type <= 69) return 'bg-eva-accent-cyan'; // Passenger
  if (type >= 30 && type <= 39) return 'bg-eva-accent-cyan'; // Fishing/Sailing
  if (type >= 50 && type <= 59) return 'bg-eva-accent-orange'; // Special craft
  if (type >= 40 && type <= 49) return 'bg-eva-accent-purple'; // High speed
  return 'bg-eva-text-secondary';
};

// Get vessel type label
const getVesselTypeLabel = (type?: number) => {
  if (!type) return 'Unknown';
  if (type >= 70 && type <= 79) return 'Cargo';
  if (type >= 80 && type <= 89) return 'Tanker';
  if (type >= 60 && type <= 69) return 'Passenger';
  if (type === 30) return 'Fishing';
  if (type === 36 || type === 37) return 'Sailing';
  if (type >= 50 && type <= 59) return 'Special';
  if (type >= 40 && type <= 49) return 'High Speed';
  return 'Other';
};

export function VesselListCard({ vessels, selectedVesselMmsi, onVesselClick, searchQuery }: VesselListCardProps) {
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Sort vessels
  const sortedVessels = useMemo(() => {
    const sorted = [...vessels];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.name || a.mmsi).localeCompare(b.name || b.mmsi));
        break;
      case 'speed':
        sorted.sort((a, b) => (b.position?.sog || 0) - (a.position?.sog || 0));
        break;
      default:
        break;
    }
    return sorted.slice(0, 100);
  }, [vessels, sortBy]);

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    vessels.forEach((v) => {
      const label = getVesselTypeLabel(v.vessel_type);
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [vessels]);

  return (
    <div className="space-y-3">
      {/* Header with count and sort */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-eva-text-accent">Vessels in View</h3>
          <p className="text-xs text-eva-text-secondary uppercase tracking-wide">[{vessels.length}] vessels on map</p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="h-8 text-xs gap-1 bg-eva-bg-tertiary border-eva-border-accent text-eva-text-primary hover:bg-eva-bg-secondary hover:border-eva-accent-orange uppercase tracking-wide"
          >
            <Filter className="h-3 w-3" />
            Sort
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 bg-eva-bg-secondary border border-eva-border-accent shadow-lg z-10 py-1 min-w-[120px]" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
              {(['name', 'speed'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-eva-bg-tertiary transition-colors uppercase tracking-wide ${
                    sortBy === option ? 'bg-eva-bg-tertiary font-medium text-eva-accent-orange border-l-2 border-eva-accent-orange' : 'text-eva-text-primary'
                  }`}
                >
                  {option === 'name' ? 'By Name' : 'By Speed'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Type Summary Pills */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(typeCounts)
            .filter(([type]) => type !== 'Unknown')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-eva-bg-tertiary text-xs text-eva-text-secondary border border-eva-border-default uppercase tracking-wide"
                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
              >
                <span
                  className={`w-2 h-2 ${getVesselTypeColor(
                    vessels.find((v) => getVesselTypeLabel(v.vessel_type) === type)?.vessel_type
                  )}`}
                  style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                />
                {type}: {count}
              </span>
            ))}
        </div>
      )}

      {/* Vessel List */}
      <ScrollArea className="h-[calc(100%-100px)]">
        <div className="space-y-1.5 pr-2">
          {sortedVessels.map((vessel) => {
            const isSelected = selectedVesselMmsi === vessel.mmsi;
            const typeColor = getVesselTypeColor(vessel.vessel_type);

            return (
              <button
                key={vessel.mmsi}
                onClick={() => onVesselClick(vessel.mmsi)}
                className={`group w-full text-left p-3 transition-all border-l-2 relative overflow-hidden ${
                  isSelected
                    ? 'bg-eva-bg-tertiary border-eva-accent-orange shadow-lg shadow-eva-accent-orange/20'
                    : 'hover:bg-eva-bg-tertiary hover:shadow-md border-transparent hover:border-eva-accent-orange'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
              >
                {/* Scan effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-eva-accent-orange/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                
                <div className="flex items-start gap-3 relative">
                  {/* Vessel Icon with Type Color */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-eva-accent-orange/20' : `${typeColor}/10`
                    }`}
                    style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                  >
                    <Ship
                      className={`h-5 w-5 ${isSelected ? 'text-eva-accent-orange' : typeColor.replace('bg-', 'text-')}`}
                    />
                  </div>

                  {/* Vessel Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate uppercase tracking-wide ${isSelected ? 'text-eva-accent-orange' : 'text-eva-text-primary'}`}>
                        {vessel.name || `Vessel ${vessel.mmsi}`}
                      </p>
                      {!isSelected && (
                        <span
                          className={`w-2 h-2 flex-shrink-0 ${typeColor}`}
                          style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                          title={getVesselTypeLabel(vessel.vessel_type)}
                        />
                      )}
                    </div>
                    <p className={`text-xs ${isSelected ? 'text-eva-accent-orange/80' : 'text-eva-text-secondary'}`}>
                      [{vessel.mmsi}]
                    </p>

                    {/* Speed and Course */}
                    {vessel.position && (
                      <div
                        className={`flex items-center gap-3 mt-1.5 text-xs ${
                          isSelected ? 'text-eva-accent-orange/80' : 'text-eva-text-secondary'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {formatSpeed(vessel.position.sog)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation
                            className="h-3 w-3"
                            style={{ transform: `rotate(${vessel.position.cog || 0}deg)` }}
                          />
                          {formatCourse(vessel.position.cog)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Empty State */}
          {vessels.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-eva-accent-orange/10 flex items-center justify-center mx-auto mb-4" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                <MapPin className="h-8 w-8 text-eva-accent-orange/50" />
              </div>
              <p className="text-sm font-medium text-eva-text-primary uppercase tracking-wide">
                {searchQuery ? 'No vessels match your search' : 'No vessels in view'}
              </p>
              <p className="text-xs text-eva-text-secondary mt-1">
                {searchQuery ? 'Try a different search term' : 'Pan or zoom the map to see vessels'}
              </p>
            </div>
          )}

          {/* Show more indicator */}
          {vessels.length > 100 && (
            <div className="text-center py-3 text-xs text-eva-text-secondary uppercase tracking-wide">
              Showing [100] of [{vessels.length}] vessels
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
