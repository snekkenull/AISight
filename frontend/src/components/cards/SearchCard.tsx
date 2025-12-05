/**
 * SearchCard Component
 *
 * Search for vessels with integrated recent searches display.
 * Shows recent search history below the search box.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Ship, Loader2, History, Sparkles, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import type { SearchFilterCriteria, VesselWithPosition } from '../../types';
import { APP_CONFIG } from '../../config';
import { VesselAPI } from '../../services';

export interface RecentVesselEntry {
  mmsi: string;
  name?: string;
  timestamp: number;
  source: 'manual' | 'ai';
}

interface SearchCardProps {
  onFilterChange: (criteria: SearchFilterCriteria) => void;
  onVesselClick: (mmsi: string) => void;
  totalVessels: number;
  filteredVessels: number;
  recentEntries?: RecentVesselEntry[];
  vessels?: VesselWithPosition[];
  onRemoveRecentEntry?: (mmsi: string) => void;
  onClearAllRecent?: () => void;
}

export function SearchCard({
  onFilterChange,
  onVesselClick,
  totalVessels,
  filteredVessels,
  recentEntries = [],
  vessels = [],
  onRemoveRecentEntry,
  onClearAllRecent,
}: SearchCardProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<VesselWithPosition[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const vesselMap = new Map(vessels.map((v) => [v.mmsi, v]));

  // Merge recent entries with vessel data
  const recentVessels = recentEntries.map((entry) => {
    const vessel = vesselMap.get(entry.mmsi);
    return {
      ...entry,
      vessel,
      displayName: vessel?.name || entry.name || `Vessel ${entry.mmsi}`,
    };
  });

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const notifyFilterChange = useCallback(
    (text: string) => {
      onFilterChange({ searchText: text, boundingBox: null });
    },
    [onFilterChange]
  );

  // Search vessels from API
  const searchVessels = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await VesselAPI.searchVessels(query, 20);
      setSearchResults(results);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        notifyFilterChange(value);
        searchVessels(value);
      }, APP_CONFIG.searchDebounceDelay);
    },
    [notifyFilterChange, searchVessels]
  );

  const handleVesselSelect = useCallback(
    (vessel: VesselWithPosition) => {
      onVesselClick(vessel.mmsi);
      setShowDropdown(false);
      setSearchText(vessel.name || vessel.mmsi);
    },
    [onVesselClick]
  );

  const handleClear = useCallback(() => {
    setSearchText('');
    setSearchResults([]);
    setShowDropdown(false);
    notifyFilterChange('');
  }, [notifyFilterChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Search Input */}
      <div>
        <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-eva-text-accent">Search Vessels</h3>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-eva-accent-orange animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-eva-accent-orange" />
            )}
          </div>
          <Input
            type="text"
            placeholder="ENTER VESSEL NAME OR MMSI..."
            value={searchText}
            onChange={(e) => handleSearchTextChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="pl-10 pr-10 h-10 bg-eva-bg-tertiary border-eva-border-accent text-eva-text-primary placeholder:text-eva-text-secondary/50 focus:border-eva-accent-orange focus:ring-eva-border-glow uppercase tracking-wide"
          />
          {searchText && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-eva-text-secondary hover:text-eva-accent-red transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-eva-bg-secondary border border-eva-border-accent shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              <ScrollArea className="max-h-64">
                <div className="p-1">
                  {searchResults.map((vessel) => (
                    <button
                      key={vessel.mmsi}
                      onClick={() => handleVesselSelect(vessel)}
                      className="w-full text-left p-2.5 hover:bg-eva-bg-tertiary transition-all flex items-center gap-3 group border-l-2 border-transparent hover:border-eva-accent-orange relative overflow-hidden"
                    >
                      {/* Scan effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-eva-accent-orange/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <div className="w-8 h-8 bg-eva-accent-orange/10 flex items-center justify-center flex-shrink-0 group-hover:bg-eva-accent-orange/20 transition-colors relative" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                        <Ship className="h-4 w-4 text-eva-accent-orange" />
                      </div>
                      <div className="flex-1 min-w-0 relative">
                        <p className="text-sm font-medium truncate text-eva-text-primary uppercase tracking-wide">
                          {vessel.name || `Vessel ${vessel.mmsi}`}
                        </p>
                        <p className="text-xs text-eva-text-secondary">MMSI: {vessel.mmsi}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No Results Message */}
          {showDropdown && searchText && !isSearching && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-eva-bg-secondary border border-eva-accent-red shadow-xl z-50 p-4 text-center animate-in fade-in-0 zoom-in-95 duration-150" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              <Ship className="h-8 w-8 text-eva-accent-red mx-auto mb-2 opacity-50" />
              <p className="text-sm text-eva-text-primary uppercase tracking-wide">No vessels found</p>
              <p className="text-xs text-eva-text-secondary mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {searchText && !showDropdown && (
          <p className="text-xs text-eva-text-secondary mt-2 uppercase tracking-wide">
            [{filteredVessels}] of [{totalVessels}] vessels match
          </p>
        )}
      </div>

      {/* Recent Searches Section */}
      <div className="border-t border-eva-border-accent pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-eva-accent-orange" />
            <h4 className="text-sm font-medium text-eva-text-accent uppercase tracking-wider">Recent Searches</h4>
          </div>
          {recentEntries.length > 0 && onClearAllRecent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllRecent}
              className="h-6 px-2 text-xs text-eva-text-secondary hover:text-eva-accent-red hover:bg-eva-accent-red/10 uppercase tracking-wide"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[280px]">
          <div className="space-y-1 pr-2">
            {recentVessels.map((entry) => (
              <div
                key={`${entry.mmsi}-${entry.timestamp}`}
                className="group relative flex items-center gap-2.5 p-2 hover:bg-eva-bg-tertiary transition-all cursor-pointer border-l-2 border-transparent hover:border-eva-accent-orange overflow-hidden"
                onClick={() => onVesselClick(entry.mmsi)}
              >
                {/* Scan effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-eva-accent-orange/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                
                {/* Vessel Icon with Source Indicator */}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${
                      entry.source === 'ai'
                        ? 'bg-gradient-to-br from-eva-accent-purple/20 to-eva-accent-purple/10'
                        : 'bg-eva-accent-orange/10'
                    }`}
                    style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                  >
                    <Ship
                      className={`h-3.5 w-3.5 ${
                        entry.source === 'ai' ? 'text-eva-accent-purple' : 'text-eva-accent-orange'
                      }`}
                    />
                  </div>
                  {entry.source === 'ai' && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-eva-accent-purple to-eva-accent-purple flex items-center justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                      <Sparkles className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Vessel Info */}
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-sm font-medium truncate text-eva-text-primary uppercase tracking-wide">{entry.displayName}</p>
                  <div className="flex items-center gap-2 text-xs text-eva-text-secondary">
                    <span>[{entry.mmsi}]</span>
                    <span>•</span>
                    <span>{formatTimeAgo(entry.timestamp)}</span>
                  </div>
                </div>

                {/* Remove Button */}
                {onRemoveRecentEntry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentEntry(entry.mmsi);
                    }}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-eva-text-secondary hover:text-eva-accent-red hover:bg-eva-accent-red/10 z-10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            {recentVessels.length === 0 && (
              <div className="text-center py-6">
                <History className="h-5 w-5 text-eva-text-secondary/40 mx-auto mb-2" />
                <p className="text-xs text-eva-text-secondary uppercase tracking-wide">No recent searches</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Legend */}
        {recentVessels.length > 0 && recentVessels.some((v) => v.source === 'ai') && (
          <div className="flex items-center gap-4 pt-2 mt-2 border-t border-eva-border-default text-xs text-eva-text-secondary uppercase tracking-wide">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-eva-accent-orange" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />
              <span>Manual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-gradient-to-br from-eva-accent-purple to-eva-accent-purple" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />
              <span>AI</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
