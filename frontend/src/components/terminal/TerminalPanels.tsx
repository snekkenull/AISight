/**
 * TerminalPanels Component
 * 
 * Terminal-style overlay panels for status bar functions.
 * Displays search, vessel list, tracking, fleet, weather, and coverage panels.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { TerminalWindow } from './TerminalWindow';
import type { StatusBarPanel } from './StatusBar';
import type { VesselWithPosition, SearchFilterCriteria } from '../../types';
import type { TrackedVesselInfo } from '../cards/TrackedVesselsCard';
import type { RecentVesselEntry } from '../cards/SearchCard';
import { getSchedulerStatus, getHealthStatus } from '../../services/VesselAPI';
import type { SchedulerStatus, HealthStatus } from '../../services/VesselAPI';
import { VesselAPI } from '../../services';
import { APP_CONFIG } from '../../config';

export interface TerminalPanelsProps {
  activePanel: StatusBarPanel;
  onClose: () => void;
  // Search panel props
  onFilterChange?: (criteria: SearchFilterCriteria) => void;
  onVesselClick?: (mmsi: string) => void;
  totalVessels?: number;
  filteredVessels?: number;
  recentEntries?: RecentVesselEntry[];
  vessels?: Map<string, VesselWithPosition>;
  onRemoveRecentEntry?: (mmsi: string) => void;
  onClearAllRecent?: () => void;
  // Vessel list props
  vesselArray?: VesselWithPosition[];
  selectedVesselMmsi?: string | null;
  searchQuery?: string;
  // Tracking props
  trackedVessels?: TrackedVesselInfo[];
  currentTrackingMmsi?: string | null;
  onStopTracking?: (mmsi: string) => void;
  onStopAllTracking?: () => void;
  // Weather/Coverage props
  mapCenter?: { lat: number; lon: number } | null;
}

/**
 * TerminalPanels Component
 */
export function TerminalPanels({
  activePanel,
  onClose,
  onFilterChange,
  onVesselClick,
  totalVessels = 0,
  filteredVessels = 0,
  recentEntries = [],
  vessels,
  onRemoveRecentEntry,
  onClearAllRecent,
  vesselArray = [],
  selectedVesselMmsi,
  searchQuery = '',
  trackedVessels = [],
  currentTrackingMmsi,
  onStopTracking,
  onStopAllTracking,
  mapCenter,
}: TerminalPanelsProps): JSX.Element | null {
  if (!activePanel) return null;

  const handleVesselClick = useCallback((mmsi: string) => {
    onVesselClick?.(mmsi);
    onClose();
  }, [onVesselClick, onClose]);

  const panelContent = () => {
    switch (activePanel) {
      case 'search':
        return <SearchPanelContent 
          onFilterChange={onFilterChange}
          onVesselClick={handleVesselClick}
          totalVessels={totalVessels}
          filteredVessels={filteredVessels}
          recentEntries={recentEntries}
          vessels={vessels}
          onRemoveRecentEntry={onRemoveRecentEntry}
          onClearAllRecent={onClearAllRecent}
        />;
      case 'vessels':
        return <VesselListPanelContent 
          vessels={vesselArray}
          selectedVesselMmsi={selectedVesselMmsi}
          onVesselClick={handleVesselClick}
          searchQuery={searchQuery}
        />;
      case 'tracking':
        return <TrackingPanelContent 
          trackedVessels={trackedVessels}
          vessels={vessels}
          currentTrackingMmsi={currentTrackingMmsi}
          onVesselClick={handleVesselClick}
          onStopTracking={onStopTracking}
          onStopAllTracking={onStopAllTracking}
        />;
      case 'weather':
        return <WeatherPanelContent mapCenter={mapCenter} />;
      case 'coverage':
        return <CoveragePanelContent 
          totalVessels={totalVessels}
          filteredVessels={filteredVessels}
          mapCenter={mapCenter}
        />;
      default:
        return null;
    }
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'search': return 'SEARCH VESSELS';
      case 'vessels': return 'VESSEL LIST';
      case 'tracking': return 'TRACKED VESSELS';
      case 'weather': return 'WEATHER DATA';
      case 'coverage': return 'AIS COVERAGE';
      default: return 'PANEL';
    }
  };

  return (
    <div 
      className="absolute inset-0 flex items-start justify-center pt-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <TerminalWindow 
          title={getPanelTitle()} 
          borderStyle="single"
          onClose={onClose}
        >
          <div 
            className="terminal-scrollbar p-2"
            style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {panelContent()}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}

// Search Panel Content
interface SearchPanelContentProps {
  onFilterChange?: (criteria: SearchFilterCriteria) => void;
  onVesselClick?: (mmsi: string) => void;
  totalVessels: number;
  filteredVessels: number;
  recentEntries: RecentVesselEntry[];
  vessels?: Map<string, VesselWithPosition>;
  onRemoveRecentEntry?: (mmsi: string) => void;
  onClearAllRecent?: () => void;
}

function SearchPanelContent({
  onFilterChange,
  onVesselClick,
  totalVessels,
  filteredVessels,
  recentEntries,
  vessels,
  onRemoveRecentEntry,
  onClearAllRecent,
}: SearchPanelContentProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<VesselWithPosition[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search vessels from API
  const searchVessels = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true); // Show dropdown immediately when searching
    try {
      const results = await VesselAPI.searchVessels(query, 20);
      console.log('Search results:', results.length, 'vessels found for query:', query);
      setSearchResults(results);
      setShowDropdown(true); // Keep dropdown open even if no results
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowDropdown(true); // Show dropdown with error message
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        onFilterChange?.({ searchText: value, boundingBox: null });
        searchVessels(value);
      }, APP_CONFIG.searchDebounceDelay);
    },
    [onFilterChange, searchVessels]
  );

  const handleVesselSelect = useCallback(
    (vessel: VesselWithPosition) => {
      onVesselClick?.(vessel.mmsi);
      setShowDropdown(false);
      setSearchText('');
      setSearchResults([]);
    },
    [onVesselClick]
  );

  const handleClear = useCallback(() => {
    setSearchText('');
    setSearchResults([]);
    setShowDropdown(false);
    onFilterChange?.({ searchText: '', boundingBox: null });
  }, [onFilterChange]);

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
    <div style={{ fontFamily: "'Share Tech Mono', monospace" }} ref={containerRef}>
      <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
        // SEARCH BY VESSEL NAME OR MMSI
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="ENTER SEARCH QUERY..."
          value={searchText}
          onChange={(e) => handleSearchTextChange(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          style={{
            width: '100%',
            padding: '0.5rem',
            paddingRight: searchText ? '2rem' : '0.5rem',
            backgroundColor: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-dim)',
            color: 'var(--terminal-fg)',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
          }}
        />
        {isSearching && (
          <div style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--terminal-accent)',
            fontSize: '0.75rem',
          }}>
            [...]
          </div>
        )}
        {searchText && !isSearching && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--terminal-dim)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: 0,
            }}
          >
            [X]
          </button>
        )}

        {/* Loading Message */}
        {showDropdown && searchText && isSearching && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-accent)',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--terminal-accent)',
            fontSize: '0.75rem',
            zIndex: 10001,
          }}>
            <div>[...] SEARCHING VESSELS</div>
          </div>
        )}

        {/* Search Results Dropdown */}
        {showDropdown && !isSearching && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-accent)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 10001,
          }}>
            {searchResults.map((vessel) => (
              <button
                key={vessel.mmsi}
                onClick={() => handleVesselSelect(vessel)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderLeft: '2px solid var(--terminal-dim)',
                  color: 'var(--terminal-fg)',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--terminal-dim)';
                  e.currentTarget.style.borderLeftColor = 'var(--terminal-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderLeftColor = 'var(--terminal-dim)';
                }}
              >
                <div>{vessel.name || `VESSEL ${vessel.mmsi}`}</div>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '0.65rem' }}>
                  [MMSI: {vessel.mmsi}]
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showDropdown && searchText && !isSearching && searchResults.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-error)',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--terminal-dim)',
            fontSize: '0.75rem',
            zIndex: 10001,
          }}>
            <div>[!] NO VESSELS FOUND</div>
            <div style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
              TRY A DIFFERENT SEARCH TERM
            </div>
          </div>
        )}
      </div>
      <div style={{ color: 'var(--terminal-dim)', marginTop: '0.5rem', fontSize: '0.75rem' }}>
        [{filteredVessels}] OF [{totalVessels}] VESSELS
      </div>
      
      {recentEntries.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            color: 'var(--terminal-accent)', 
            marginBottom: '0.5rem',
            fontSize: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>// RECENT SEARCHES</span>
            {onClearAllRecent && (
              <button
                onClick={onClearAllRecent}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--terminal-dim)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                [CLEAR]
              </button>
            )}
          </div>
          {recentEntries.slice(0, 10).map((entry) => {
            const vessel = vessels?.get(entry.mmsi);
            const formatTimeAgo = (timestamp: number) => {
              const seconds = Math.floor((Date.now() - timestamp) / 1000);
              if (seconds < 60) return 'Just now';
              if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
              if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
              return `${Math.floor(seconds / 86400)}d ago`;
            };
            
            return (
              <div
                key={`${entry.mmsi}-${entry.timestamp}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  borderLeft: `2px solid ${entry.source === 'ai' ? 'var(--terminal-accent)' : 'var(--terminal-dim)'}`,
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => onVesselClick?.(entry.mmsi)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: 'var(--terminal-fg)', 
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>{vessel?.name || entry.name || `VESSEL ${entry.mmsi}`}</span>
                    {entry.source === 'ai' && (
                      <span style={{ 
                        color: 'var(--terminal-accent)', 
                        fontSize: '0.65rem',
                        padding: '0 0.25rem',
                        border: '1px solid var(--terminal-accent)'
                      }}>
                        [AI]
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    color: 'var(--terminal-dim)', 
                    fontSize: '0.65rem',
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.125rem'
                  }}>
                    <span>[{entry.mmsi}]</span>
                    <span>•</span>
                    <span>{formatTimeAgo(entry.timestamp)}</span>
                  </div>
                </div>
                {onRemoveRecentEntry && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentEntry(entry.mmsi);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--terminal-dim)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: '0.25rem',
                    }}
                  >
                    [X]
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {recentEntries.length === 0 && (
        <div style={{ 
          marginTop: '2rem', 
          textAlign: 'center', 
          color: 'var(--terminal-dim)',
          fontSize: '0.75rem'
        }}>
          <div>NO RECENT SEARCHES</div>
          <div style={{ fontSize: '0.65rem', marginTop: '0.5rem' }}>
            SEARCH FOR VESSELS TO BUILD HISTORY
          </div>
        </div>
      )}
    </div>
  );
}

// Vessel List Panel Content
interface VesselListPanelContentProps {
  vessels: VesselWithPosition[];
  selectedVesselMmsi?: string | null;
  onVesselClick?: (mmsi: string) => void;
  searchQuery: string;
}

function VesselListPanelContent({
  vessels,
  selectedVesselMmsi,
  onVesselClick,
  searchQuery: _searchQuery,
}: VesselListPanelContentProps) {
  // Note: searchQuery is available for future filtering
  void _searchQuery;
  const displayVessels = vessels.slice(0, 50);
  
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
        // [{vessels.length}] VESSELS IN VIEW
      </div>
      
      {displayVessels.length === 0 ? (
        <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '2rem' }}>
          NO VESSELS IN CURRENT VIEW
        </div>
      ) : (
        <div>
          {displayVessels.map((vessel) => (
            <button
              key={vessel.mmsi}
              onClick={() => onVesselClick?.(vessel.mmsi)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem',
                backgroundColor: selectedVesselMmsi === vessel.mmsi ? 'var(--terminal-dim)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${selectedVesselMmsi === vessel.mmsi ? 'var(--terminal-accent)' : 'var(--terminal-dim)'}`,
                color: 'var(--terminal-fg)',
                fontFamily: 'inherit',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginBottom: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{vessel.name || `VESSEL ${vessel.mmsi}`}</span>
                {vessel.position?.sog !== undefined && (
                  <span style={{ color: 'var(--terminal-dim)' }}>
                    {vessel.position.sog.toFixed(1)} KN
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--terminal-dim)' }}>[{vessel.mmsi}]</div>
            </button>
          ))}
          {vessels.length > 50 && (
            <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', marginTop: '0.5rem', fontSize: '0.7rem' }}>
              SHOWING 50 OF {vessels.length} VESSELS
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tracking Panel Content
interface TrackingPanelContentProps {
  trackedVessels: TrackedVesselInfo[];
  vessels?: Map<string, VesselWithPosition>;
  currentTrackingMmsi?: string | null;
  onVesselClick?: (mmsi: string) => void;
  onStopTracking?: (mmsi: string) => void;
  onStopAllTracking?: () => void;
}

function TrackingPanelContent({
  trackedVessels,
  vessels,
  currentTrackingMmsi,
  onVesselClick,
  onStopTracking,
  onStopAllTracking,
}: TrackingPanelContentProps) {
  const formatDuration = (startTime: number) => {
    const minutes = Math.floor((Date.now() - startTime) / 60000);
    if (minutes < 60) return `${minutes}M`;
    const hours = Math.floor(minutes / 60);
    return `${hours}H ${minutes % 60}M`;
  };

  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ 
        color: 'var(--terminal-dim)', 
        marginBottom: '1rem', 
        fontSize: '0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>// [{trackedVessels.length}] VESSELS TRACKED</span>
        {trackedVessels.length > 1 && onStopAllTracking && (
          <button
            onClick={onStopAllTracking}
            style={{
              background: 'none',
              border: '1px solid var(--terminal-error)',
              color: 'var(--terminal-error)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'inherit',
            }}
          >
            [STOP ALL]
          </button>
        )}
      </div>
      
      {trackedVessels.length === 0 ? (
        <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '2rem' }}>
          <div>NO VESSELS BEING TRACKED</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
            SELECT A VESSEL AND CLICK TRACK TO START
          </div>
        </div>
      ) : (
        <div>
          {trackedVessels.map((tracked) => {
            const vessel = vessels?.get(tracked.mmsi);
            const isActive = tracked.mmsi === currentTrackingMmsi;
            return (
              <div
                key={tracked.mmsi}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: isActive ? 'rgba(255, 102, 0, 0.1)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? 'var(--terminal-accent)' : 'var(--terminal-dim)'}`,
                  marginBottom: '0.25rem',
                }}
              >
                <button
                  onClick={() => onVesselClick?.(tracked.mmsi)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--terminal-fg)',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div>{vessel?.name || tracked.name || `VESSEL ${tracked.mmsi}`}</div>
                  <div style={{ color: 'var(--terminal-dim)', display: 'flex', gap: '1rem' }}>
                    <span>[{tracked.mmsi}]</span>
                    <span>TRACKING: {formatDuration(tracked.startedAt)}</span>
                  </div>
                </button>
                {onStopTracking && (
                  <button
                    onClick={() => onStopTracking(tracked.mmsi)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--terminal-error)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: 'inherit',
                    }}
                  >
                    [X]
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginTop: '1rem', textAlign: 'center' }}>
        TRACKED VESSELS UPDATE EVERY 30 MINUTES
      </div>
    </div>
  );
}

// Weather Panel Content
interface WeatherPanelContentProps {
  mapCenter?: { lat: number; lon: number } | null;
}

function WeatherPanelContent({ mapCenter }: WeatherPanelContentProps) {
  const [weather, setWeather] = useState<{
    waveHeight: number;
    waveDirection: number;
    wavePeriod: number;
    windWaveHeight: number;
    swellWaveHeight: number;
    seaSurfaceTemp: number;
    oceanCurrentVelocity: number;
    oceanCurrentDirection: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!mapCenter) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        latitude: mapCenter.lat.toFixed(4),
        longitude: mapCenter.lon.toFixed(4),
        current: [
          'wave_height', 'wave_direction', 'wave_period',
          'wind_wave_height', 'swell_wave_height', 'sea_surface_temperature',
          'ocean_current_velocity', 'ocean_current_direction',
        ].join(','),
      });
      const response = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`);
      if (response.ok) {
        const data = await response.json();
        const current = data.current;
        setWeather({
          waveHeight: current.wave_height ?? 0,
          waveDirection: current.wave_direction ?? 0,
          wavePeriod: current.wave_period ?? 0,
          windWaveHeight: current.wind_wave_height ?? 0,
          swellWaveHeight: current.swell_wave_height ?? 0,
          seaSurfaceTemp: current.sea_surface_temperature ?? 0,
          oceanCurrentVelocity: current.ocean_current_velocity ?? 0,
          oceanCurrentDirection: current.ocean_current_direction ?? 0,
        });
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
    } finally {
      setLoading(false);
    }
  }, [mapCenter]);

  useEffect(() => {
    if (mapCenter) {
      fetchWeather();
    }
  }, [mapCenter, fetchWeather]);

  const getSeaState = (height: number) => {
    if (height < 0.1) return { state: 'CALM', symbol: '---' };
    if (height < 0.5) return { state: 'SMOOTH', symbol: '~~~' };
    if (height < 1.25) return { state: 'SLIGHT', symbol: '≈≈≈' };
    if (height < 2.5) return { state: 'MODERATE', symbol: '≋≋≋' };
    if (height < 4) return { state: 'ROUGH', symbol: '[!]' };
    if (height < 6) return { state: 'VERY ROUGH', symbol: '[!!]' };
    return { state: 'HIGH', symbol: '[!!!]' };
  };

  if (!mapCenter) {
    return (
      <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
          // MARINE WEATHER DATA
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--terminal-dim)' }}>
          <div>[!] NO LOCATION</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
            MOVE MAP TO LOAD SEA CONDITIONS
          </div>
        </div>
      </div>
    );
  }

  if (loading && !weather) {
    return (
      <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
          // MARINE WEATHER DATA
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--terminal-accent)' }}>
          <div>[...] LOADING WEATHER DATA</div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
          // MARINE WEATHER DATA
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--terminal-dim)' }}>
          <div>[X] WEATHER UNAVAILABLE</div>
        </div>
      </div>
    );
  }

  const seaState = getSeaState(weather.waveHeight);

  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
        // MARINE WEATHER DATA
      </div>
      
      {/* Sea State Header */}
      <div style={{ 
        padding: '0.75rem', 
        border: '1px solid var(--terminal-accent)',
        marginBottom: '1rem',
        backgroundColor: 'rgba(255, 102, 0, 0.05)',
      }}>
        <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
          [SEA STATE]
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--terminal-accent)', fontSize: '1rem' }}>{seaState.symbol}</span>
          <span style={{ color: 'var(--terminal-fg)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            {seaState.state}
          </span>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--terminal-fg)', fontSize: '2rem' }}>
            {weather.waveHeight.toFixed(1)}
          </span>
          <span style={{ color: 'var(--terminal-dim)', fontSize: '1rem', marginLeft: '0.25rem' }}>M</span>
        </div>
      </div>

      {/* Weather Data Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <DataRow label="WAVE PERIOD" value={`${weather.wavePeriod.toFixed(0)}S`} />
        <DataRow label="WAVE DIR" value={`${weather.waveDirection.toFixed(0)}DEG`} />
        <DataRow label="SEA TEMP" value={`${weather.seaSurfaceTemp.toFixed(1)}C`} />
        <DataRow label="CURRENT" value={`${weather.oceanCurrentVelocity.toFixed(1)}KM/H`} />
        {weather.windWaveHeight > 0 && (
          <DataRow label="WIND WAVE" value={`${weather.windWaveHeight.toFixed(1)}M`} />
        )}
        {weather.swellWaveHeight > 0 && (
          <DataRow label="SWELL" value={`${weather.swellWaveHeight.toFixed(1)}M`} />
        )}
      </div>

      {/* Location & Update */}
      <div style={{ 
        marginTop: '1rem', 
        paddingTop: '0.75rem', 
        borderTop: '1px solid var(--terminal-dim)',
        fontSize: '0.7rem',
        color: 'var(--terminal-dim)',
      }}>
        <div>[LOC]: {mapCenter.lat.toFixed(4)}N {mapCenter.lon.toFixed(4)}W</div>
        {lastUpdate && (
          <div>[UPD]: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchWeather}
        disabled={loading}
        style={{
          marginTop: '0.75rem',
          width: '100%',
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px solid var(--terminal-dim)',
          color: 'var(--terminal-fg)',
          fontFamily: 'inherit',
          fontSize: '0.75rem',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? '[...LOADING]' : '[REFRESH]'}
      </button>
    </div>
  );
}

// Data Row helper component
function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ 
      padding: '0.5rem', 
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderLeft: '2px solid var(--terminal-dim)',
    }}>
      <div style={{ color: 'var(--terminal-dim)', fontSize: '0.65rem' }}>[{label}]</div>
      <div style={{ color: 'var(--terminal-fg)', fontSize: '0.875rem' }}>{value}</div>
    </div>
  );
}

// Coverage Panel Content
interface CoveragePanelContentProps {
  totalVessels: number;
  filteredVessels: number;
  mapCenter?: { lat: number; lon: number } | null;
}

// Helper function to format time until next rotation
function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const targetTime = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = targetTime - now;
  if (diffMs <= 0) return 'SOON';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}H ${minutes}M`;
  return `${minutes}M`;
}

// Helper function to format last update time
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

function CoveragePanelContent({ mapCenter: _mapCenter }: CoveragePanelContentProps) {
  // Note: mapCenter is available for future use
  void _mapCenter;
  
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegions, setShowRegions] = useState(false);

  // Fetch status data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [health, scheduler] = await Promise.all([
          getHealthStatus(),
          getSchedulerStatus(),
        ]);
        setHealthStatus(health);
        setSchedulerStatus(scheduler);
      } catch (err) {
        console.error('Error fetching coverage data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate data freshness percentage
  const getDataFreshness = (): number => {
    if (!healthStatus?.dataStatus) return 0;
    const { vesselsWithPosition, vesselsWithRecentPosition } = healthStatus.dataStatus;
    if (vesselsWithPosition === 0) return 0;
    return Math.round((vesselsWithRecentPosition / vesselsWithPosition) * 100);
  };

  // Get service status indicator
  const getServiceStatus = (status: string) => {
    switch (status) {
      case 'connected':
        return { symbol: '[OK]', color: 'var(--terminal-success)' };
      case 'disconnected':
        return { symbol: '[ERR]', color: 'var(--terminal-error)' };
      case 'not_configured':
        return { symbol: '[N/A]', color: 'var(--terminal-dim)' };
      default:
        return { symbol: '[???]', color: 'var(--terminal-dim)' };
    }
  };

  if (isLoading) {
    return (
      <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
          // AIS DATA COVERAGE
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--terminal-accent)' }}>
          [...] LOADING COVERAGE DATA
        </div>
      </div>
    );
  }

  const overallStatus = healthStatus?.status?.toUpperCase() || 'UNKNOWN';
  const statusColor = overallStatus === 'HEALTHY' 
    ? 'var(--terminal-success)' 
    : overallStatus === 'DEGRADED' 
      ? 'var(--terminal-accent)' 
      : 'var(--terminal-error)';

  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ color: 'var(--terminal-dim)', marginBottom: '1rem', fontSize: '0.75rem' }}>
        // AIS DATA COVERAGE
      </div>
      
      {/* System Status Header */}
      <div style={{ 
        padding: '0.75rem', 
        border: '1px solid var(--terminal-accent)',
        marginBottom: '1rem',
        backgroundColor: 'rgba(255, 102, 0, 0.05)',
      }}>
        <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
          [SYSTEM STATUS]
        </div>
        <div style={{ color: statusColor, fontSize: '1.25rem', fontWeight: 'bold' }}>
          {overallStatus}
        </div>
      </div>

      {/* Vessel Data Stats */}
      {healthStatus?.dataStatus && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
            [VESSEL DATA]
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderLeft: '2px solid var(--terminal-accent)',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--terminal-fg)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {healthStatus.dataStatus.totalVessels.toLocaleString()}
              </div>
              <div style={{ color: 'var(--terminal-dim)', fontSize: '0.65rem' }}>[TOTAL]</div>
            </div>
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderLeft: '2px solid var(--terminal-success)',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--terminal-accent)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {healthStatus.dataStatus.vesselsWithRecentPosition.toLocaleString()}
              </div>
              <div style={{ color: 'var(--terminal-dim)', fontSize: '0.65rem' }}>[ACTIVE &lt;1H]</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Freshness Progress Bar */}
      {healthStatus?.dataStatus && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem' }}>[DATA FRESHNESS]</span>
            <span style={{ color: 'var(--terminal-fg)', fontSize: '0.7rem' }}>{getDataFreshness()}%</span>
          </div>
          <div style={{ 
            height: '16px', 
            backgroundColor: 'var(--terminal-bg)', 
            border: '1px solid var(--terminal-dim)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${getDataFreshness()}%`,
              backgroundColor: 'var(--terminal-accent)',
              opacity: 0.7,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Service Status */}
      {healthStatus?.services && (
        <div style={{ 
          padding: '0.75rem', 
          border: '1px solid var(--terminal-dim)',
          marginBottom: '1rem',
        }}>
          <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
            [SERVICES]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            {(['database', 'redis', 'aisStream'] as const).map((service) => {
              const status = getServiceStatus(healthStatus.services[service]);
              const label = service === 'aisStream' ? 'AIS STREAM' : service === 'redis' ? 'CACHE' : 'DATABASE';
              return (
                <div key={service} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--terminal-dim)' }}>[{label}]:</span>
                  <span style={{ color: status.color }}>{status.symbol} {healthStatus.services[service].toUpperCase().replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Statistics */}
      {healthStatus?.dataStatus && (
        <div style={{ 
          padding: '0.75rem', 
          border: '1px solid var(--terminal-dim)',
          marginBottom: '1rem',
        }}>
          <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
            [STATISTICS]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--terminal-dim)' }}>[POS REPORTS 24H]:</span>
              <span style={{ color: 'var(--terminal-fg)' }}>{healthStatus.dataStatus.positionReportsLast24h.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--terminal-dim)' }}>[LAST UPDATE]:</span>
              <span style={{ color: 'var(--terminal-accent)' }}>{formatLastUpdate(healthStatus.dataStatus.lastPositionUpdate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Regional Scheduler */}
      {schedulerStatus && (
        <div style={{ 
          padding: '0.75rem', 
          border: '1px solid var(--terminal-dim)',
          marginBottom: '1rem',
        }}>
          <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
            [REGIONAL COLLECTION]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--terminal-dim)' }}>[CURRENT REGION]:</span>
              <span style={{ color: 'var(--terminal-accent)' }}>{schedulerStatus.currentRegion?.name?.toUpperCase() || 'UNKNOWN'}</span>
            </div>
            
            {/* Cycle Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--terminal-dim)' }}>[CYCLE PROGRESS]:</span>
                <span style={{ color: 'var(--terminal-fg)' }}>{schedulerStatus.cycleProgress}%</span>
              </div>
              <div style={{ 
                height: '12px', 
                backgroundColor: 'var(--terminal-bg)', 
                border: '1px solid var(--terminal-dim)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${schedulerStatus.cycleProgress}%`,
                  backgroundColor: 'var(--terminal-accent)',
                  opacity: 0.7,
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--terminal-dim)' }}>[REGIONS]:</span>
              <span style={{ color: 'var(--terminal-fg)' }}>{schedulerStatus.regionsCompleted}/{schedulerStatus.totalRegions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--terminal-dim)' }}>[NEXT]:</span>
              <span style={{ color: 'var(--terminal-fg)' }}>{schedulerStatus.nextRegion?.name?.toUpperCase() || 'UNKNOWN'} IN {formatTimeUntil(schedulerStatus.nextRotationTime)}</span>
            </div>

            {/* Region list toggle */}
            <button
              onClick={() => setShowRegions(!showRegions)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--terminal-dim)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontFamily: 'inherit',
                textAlign: 'left',
                padding: '0.25rem 0',
              }}
            >
              [{showRegions ? '-' : '+'}] VIEW ALL REGIONS ({schedulerStatus.regions?.length || 0})
            </button>

            {showRegions && schedulerStatus.regions && (
              <div style={{ 
                borderTop: '1px solid var(--terminal-dim)', 
                paddingTop: '0.5rem', 
                maxHeight: '120px', 
                overflowY: 'auto',
              }}>
                {schedulerStatus.regions.map((region) => (
                  <div 
                    key={region.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      fontSize: '0.7rem',
                      padding: '0.125rem 0',
                      color: region.id === schedulerStatus.currentRegion?.id ? 'var(--terminal-accent)' : 'var(--terminal-dim)',
                    }}
                  >
                    <span>{region.id === schedulerStatus.currentRegion?.id ? '>' : ' '}</span>
                    <span>{region.name.toUpperCase()}</span>
                    {region.priority > 1 && <span style={{ color: 'var(--terminal-dim)' }}>(x{region.priority})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TerminalPanels;
