/**
 * App Component - Main application container
 *
 * Integrates all components with EVA Terminal Interface:
 * - TerminalLayout with CRT effects
 * - StatusBar navigation
 * - Left function block (globe, gauges, vessel info)
 * - Right function block (radar, track chart)
 * - Terminal AI dialog
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 14.6
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  MapComponent,
  ErrorDisplay,
  ErrorBoundary,
  ConnectionToast,
  CRTEffect,
  TerminalLayout,
  StatusBar,
} from './components';
import { TerminalThemeProvider, useTerminalTheme } from './hooks/useTerminalTheme';
import { TerminalAIDialog } from './components/terminal/TerminalAIDialog';
import { TerminalWindow } from './components/terminal/TerminalWindow';
import { TerminalPanels } from './components/terminal/TerminalPanels';
import { LeftFunctionBlock } from './components/visualizations/LeftFunctionBlock';
import { RadarScan } from './components/visualizations/RadarScan';
import { TrackChart } from './components/visualizations/TrackChart';
import type { SearchFilterCriteria } from './types';
import type { AIPosition, StatusBarPanel } from './components/terminal';
import { useVesselTracking, useMapVisualizations, useAI, useVesselSearch, useContinuousTracking, useReducedMotion, useEvaEffects, usePersistedState } from './hooks';
import type { VesselWithPosition, VesselPosition, BoundingBox, LookupVesselOutput, MapVisualization } from './types';
import type { RecentVesselEntry } from './components/cards/SearchCard';
import { filterVessels } from './utils/filterUtils';
import { VesselAPI } from './services';
import { hasValidPosition } from './utils/positionUtils';
import { toast } from 'sonner';

/**
 * Inner App Component with theme context access
 */
function AppContent() {
  // Get terminal theme
  const { scheme: colorScheme } = useTerminalTheme();

  // State for vessels
  const [vessels, setVessels] = useState<Map<string, VesselWithPosition>>(new Map());
  const [filteredVessels, setFilteredVessels] = useState<VesselWithPosition[]>([]);

  // State for selected vessel and track
  const [selectedVesselMmsi, setSelectedVesselMmsi] = useState<string | null>(null);
  const [vesselTrack, setVesselTrack] = useState<VesselPosition[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [trackUnavailableMessage, setTrackUnavailableMessage] = useState<string | null>(null);
  const [centerMapPosition, setCenterMapPosition] = useState<{ lat: number; lon: number } | null>(null);

  // State for search/filter
  const [filterCriteria, setFilterCriteria] = useState<SearchFilterCriteria>({
    searchText: '',
    boundingBox: null,
  });

  // State for errors
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for AI dialog position - Requirements: 13.2, 13.3
  // Use persisted state to maintain position across refreshes
  const [aiPosition, setAIPosition] = usePersistedState<AIPosition>(
    'terminal-ai-position',
    'bottom'
  );

  // State for active status bar panel
  const [activePanel, setActivePanel] = useState<StatusBarPanel>(null);

  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // State for recent vessel searches - Requirements: 4.3
  const [recentVessels, setRecentVessels] = usePersistedState<RecentVesselEntry[]>(
    'recent-vessels-v2',
    []
  );

  // Reduced motion preference hook - Requirements: 1.7
  const prefersReducedMotion = useReducedMotion();

  // EVA effects user preference hook
  const { effectsEnabled } = useEvaEffects();

  // Map visualizations hook
  const { visualizations, addVisualization, clearAll: clearVisualizations } = useMapVisualizations();

  // Vessel search hook
  const { searchResults, search, clearSearch } = useVesselSearch();

  // AI hook with action callbacks
  const aiCallbacks = useMemo(() => ({
    onVesselLookup: (vessel: LookupVesselOutput['vessel']) => {
      if (vessel) {
        setCenterMapPosition({
          lat: vessel.position.latitude,
          lon: vessel.position.longitude,
        });
        setSelectedVesselMmsi(vessel.mmsi);
        const addRecentVessel = (window as unknown as { addRecentVessel?: (mmsi: string, name?: string, source?: 'manual' | 'ai') => void }).addRecentVessel;
        if (addRecentVessel) {
          addRecentVessel(vessel.mmsi, vessel.name, 'ai');
        }
      }
    },
    onVisualizationsAdded: (newVisualizations?: MapVisualization[]) => {
      if (newVisualizations) {
        newVisualizations.forEach((viz) => {
          addVisualization(viz);
        });
      }
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    isConfigured: isAIConfigured,
    sendMessage: sendChatMessage,
    clearChat: clearChatMessages,
  } = useAI(aiCallbacks);

  // Continuous tracking hook
  const {
    trackedVesselMmsi,
    trackedVessels,
    toggleTracking: toggleContinuousTracking,
    stopTracking: stopContinuousTracking,
    stopAllTracking,
    isVesselTracked,
  } = useContinuousTracking({
    updateInterval: 30 * 60 * 1000,
    onPositionUpdate: (updatedVessel) => {
      setVessels((prev) => {
        const updated = new Map(prev);
        updated.set(updatedVessel.mmsi, updatedVessel);
        return updated;
      });
      if (updatedVessel.mmsi === selectedVesselMmsi && updatedVessel.position) {
        setCenterMapPosition({
          lat: updatedVessel.position.latitude,
          lon: updatedVessel.position.longitude,
        });
      }
    },
    onTrackingStart: (mmsi) => {
      const vessel = vessels.get(mmsi);
      const vesselName = vessel?.name || mmsi;
      toast.success(`Started tracking ${vesselName}`, {
        description: 'Position will update every 30 minutes',
      });
    },
    onTrackingStop: (mmsi) => {
      const vessel = vessels.get(mmsi);
      const vesselName = vessel?.name || mmsi;
      toast.info(`Stopped tracking ${vesselName}`);
    },
    onError: (error) => {
      toast.error('Tracking error', {
        description: error.message,
      });
    },
  });

  // Handle position updates from WebSocket
  const handlePositionUpdate = useCallback((position: VesselPosition) => {
    setVessels((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(position.mmsi);

      if (existing) {
        updated.set(position.mmsi, { ...existing, position });
      } else {
        updated.set(position.mmsi, {
          mmsi: position.mmsi,
          name: `Vessel ${position.mmsi}`,
          vessel_type: 0,
          position,
        });
      }
      return updated;
    });
  }, []);

  // Handle static data updates from WebSocket
  const handleStaticDataUpdate = useCallback((vessel: VesselWithPosition) => {
    setVessels((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(vessel.mmsi);

      if (existing) {
        updated.set(vessel.mmsi, { ...vessel, position: existing.position });
      } else {
        updated.set(vessel.mmsi, vessel);
      }
      return updated;
    });
  }, []);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((err: Error) => {
    console.error('WebSocket error:', err);
    setError(err);
  }, []);

  // Use vessel tracking hook
  const { connectionStatus } = useVesselTracking({
    autoConnect: false,
    onPositionUpdate: handlePositionUpdate,
    onStaticDataUpdate: handleStaticDataUpdate,
    onError: handleWebSocketError,
  });

  // State for map bounds and viewport
  const [mapBounds, setMapBounds] = useState<BoundingBox | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [viewportBounds, setViewportBounds] = useState<{ north: number; south: number; east: number; west: number } | undefined>();
  const [isMapPanning, setIsMapPanning] = useState(false);

  // State for database total vessels count
  const [databaseTotalVessels, setDatabaseTotalVessels] = useState<number | undefined>(undefined);
  
  // State for database connection status
  const [databaseConnectionStatus, setDatabaseConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');

  // Update viewport bounds when map bounds change - Requirements: 5.3
  useEffect(() => {
    if (mapBounds) {
      setViewportBounds({
        north: mapBounds.maxLat,
        south: mapBounds.minLat,
        east: mapBounds.maxLon,
        west: mapBounds.minLon,
      });
    }
  }, [mapBounds]);

  // Fetch database total vessels count and connection status from health API
  useEffect(() => {
    const fetchDatabaseTotal = async () => {
      const health = await VesselAPI.getHealthStatus();
      if (health) {
        // Update database connection status
        if (health.services?.database === 'connected') {
          setDatabaseConnectionStatus('connected');
        } else if (health.services?.database === 'disconnected') {
          setDatabaseConnectionStatus('disconnected');
        } else {
          setDatabaseConnectionStatus('error');
        }
        
        // Update total vessels count
        if (health.dataStatus?.totalVessels) {
          setDatabaseTotalVessels(health.dataStatus.totalVessels);
        }
      } else {
        setDatabaseConnectionStatus('error');
      }
    };
    fetchDatabaseTotal();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDatabaseTotal, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch vessels when map bounds change
  // Debounced to prevent excessive fetching during map panning
  useEffect(() => {
    if (!mapBounds) {
      setIsLoading(false);
      return;
    }

    // Skip fetching if map is currently being panned
    // This prevents vessel updates during active map movement
    if (isMapPanning) {
      return;
    }

    // Debounce the fetch to avoid refetching during active panning
    const timeoutId = setTimeout(async () => {
      // Double-check panning state before fetching
      if (isMapPanning) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const vesselsInBounds = await VesselAPI.queryVessels({
          bbox: mapBounds,
          limit: 5000,
        });

        // Merge new vessels with existing ones to prevent marker flickering
        // Only update vessels that have changed or are new
        setVessels((prevVessels) => {
          const updatedVessels = new Map(prevVessels);
          
          // Track which vessels are in the new bounds
          const newVesselMMSIs = new Set(vesselsInBounds.map(v => v.mmsi));
          
          // Calculate buffer zone (20% beyond visible bounds) to prevent edge drift
          // This keeps vessels slightly outside the viewport to avoid flickering during pan
          const latBuffer = (mapBounds.maxLat - mapBounds.minLat) * 0.2;
          const lonBuffer = (mapBounds.maxLon - mapBounds.minLon) * 0.2;
          const bufferBounds = {
            minLat: mapBounds.minLat - latBuffer,
            maxLat: mapBounds.maxLat + latBuffer,
            minLon: mapBounds.minLon - lonBuffer,
            maxLon: mapBounds.maxLon + lonBuffer,
          };
          
          // Only remove vessels that are significantly outside the buffer zone
          // This prevents markers from being removed during panning
          for (const [mmsi, vessel] of updatedVessels.entries()) {
            if (!newVesselMMSIs.has(mmsi) && vessel.position) {
              // Check if vessel is outside the buffer zone
              const isOutsideBuffer = 
                vessel.position.latitude < bufferBounds.minLat ||
                vessel.position.latitude > bufferBounds.maxLat ||
                vessel.position.longitude < bufferBounds.minLon ||
                vessel.position.longitude > bufferBounds.maxLon;
              
              // Only remove if outside buffer zone
              if (isOutsideBuffer) {
                updatedVessels.delete(mmsi);
              }
            }
          }
          
          // Add or update vessels from the new query
          vesselsInBounds.forEach((vessel) => {
            updatedVessels.set(vessel.mmsi, vessel);
          });
          
          return updatedVessels;
        });
      } catch (err) {
        console.error('Error fetching vessels in bounds:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce - only fetch after user stops panning for half a second

    return () => clearTimeout(timeoutId);
  }, [mapBounds, isMapPanning]);

  // Trigger search when search text changes
  useEffect(() => {
    const performSearch = async () => {
      if (filterCriteria.searchText.trim()) {
        await search(filterCriteria.searchText);

        if (searchResults.length === 0 && /^\d{9}$/.test(filterCriteria.searchText.trim())) {
          try {
            const mmsi = filterCriteria.searchText.trim();
            const vessel = await VesselAPI.getVesselByMMSI(mmsi);

            if (vessel) {
              setVessels((prev) => {
                const updated = new Map(prev);
                updated.set(vessel.mmsi, vessel);
                return updated;
              });
            }
          } catch (err) {
            console.error('Error fetching vessel from API:', err);
          }
        }
      } else {
        clearSearch();
      }
    };

    performSearch();
  }, [filterCriteria.searchText, search, clearSearch, searchResults.length]);

  // Filter vessels based on search criteria
  useEffect(() => {
    if (filterCriteria.searchText.trim()) {
      const filtered = filterVessels(searchResults, {
        searchText: '',
        boundingBox: filterCriteria.boundingBox,
      });
      setFilteredVessels(filtered);
    } else {
      const vesselsArray = Array.from(vessels.values());
      const filtered = filterVessels(vesselsArray, {
        searchText: '',
        boundingBox: filterCriteria.boundingBox,
      });
      setFilteredVessels(filtered);
    }
  }, [vessels, filterCriteria, searchResults]);

  // Handle vessel selection
  const handleVesselSelect = useCallback(async (mmsi: string) => {
    if (!mmsi) {
      setSelectedVesselMmsi(null);
      setVesselTrack([]);
      setLoadingTrack(false);
      setTrackUnavailableMessage(null);
      return;
    }

    setSelectedVesselMmsi(mmsi);
    setTrackUnavailableMessage(null);

    const vessel = vessels.get(mmsi);

    if (!vessel || !hasValidPosition(vessel)) {
      setVesselTrack([]);
      setTrackUnavailableMessage('No track data available. This vessel does not have position data.');
      return;
    }

    setLoadingTrack(true);
    setError(null);

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      const track = await VesselAPI.getVesselTrack(mmsi, startTime, endTime);

      if (track.length === 0) {
        setVesselTrack([]);
        setTrackUnavailableMessage('No track data available for the last 24 hours.');
      } else {
        setVesselTrack(track);
        setTrackUnavailableMessage(null);
      }
    } catch (err) {
      console.error('Error fetching vessel track:', err);
      const error = err as Error;
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        setTrackUnavailableMessage('No track data available for this vessel.');
      } else {
        setError(error);
      }
      setVesselTrack([]);
    } finally {
      setLoadingTrack(false);
    }
  }, [vessels]);

  // Add vessel to recent list
  const addRecentVessel = useCallback(
    (mmsi: string, name?: string, source: 'manual' | 'ai' = 'manual') => {
      setRecentVessels((prev) => {
        // Remove existing entry if present
        const filtered = prev.filter((entry) => entry.mmsi !== mmsi);
        // Add new entry at the beginning
        const newEntry: RecentVesselEntry = {
          mmsi,
          name,
          timestamp: Date.now(),
          source,
        };
        return [newEntry, ...filtered].slice(0, 20); // Keep last 20
      });
    },
    [setRecentVessels]
  );

  // Remove vessel from recent list
  const removeRecentVessel = useCallback(
    (mmsi: string) => {
      setRecentVessels((prev) => prev.filter((entry) => entry.mmsi !== mmsi));
    },
    [setRecentVessels]
  );

  // Clear all recent vessels
  const clearAllRecentVessels = useCallback(() => {
    setRecentVessels([]);
  }, [setRecentVessels]);

  // Expose addRecentVessel for AI callbacks via window
  useEffect(() => {
    (window as unknown as { addRecentVessel: typeof addRecentVessel }).addRecentVessel =
      addRecentVessel;
    return () => {
      delete (window as unknown as { addRecentVessel?: typeof addRecentVessel }).addRecentVessel;
    };
  }, [addRecentVessel]);

  // Handle vessel click from list (centers map)
  const handleVesselClick = useCallback((mmsi: string) => {
    handleVesselSelect(mmsi);
    const vessel = vessels.get(mmsi);
    addRecentVessel(mmsi, vessel?.name, 'manual');
    if (vessel?.position && vessel.position.latitude !== undefined && vessel.position.longitude !== undefined) {
      setCenterMapPosition({
        lat: vessel.position.latitude,
        lon: vessel.position.longitude,
      });
    }
  }, [handleVesselSelect, vessels, addRecentVessel]);

  // Handle vessel selection from map (does NOT center map - keeps view unchanged)
  const handleVesselSelectFromMap = useCallback((mmsi: string) => {
    handleVesselSelect(mmsi);
    // Do NOT call setCenterMapPosition here - keep map view unchanged
  }, [handleVesselSelect]);

  // Handle map centering failure
  const handleCenteringFailed = useCallback((message: string) => {
    console.warn('Map centering failed:', message);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((criteria: SearchFilterCriteria) => {
    setFilterCriteria(criteria);
  }, []);

  // Dismiss error
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Handle send chat message
  const handleSendChatMessage = useCallback(async (message: string) => {
    // Use actual map bounds for accurate context, fallback to global if not available
    const bounds: BoundingBox = mapBounds ?? {
      minLat: -90,
      maxLat: 90,
      minLon: -180,
      maxLon: 180,
    };

    await sendChatMessage(message, {
      vessels,
      selectedVessel: selectedVesselMmsi,
      mapBounds: bounds,
    });
  }, [vessels, selectedVesselMmsi, sendChatMessage, mapBounds]);

  // Handle smart analysis
  const handleSmartAnalysis = useCallback((vessel: VesselWithPosition) => {
    const vesselName = vessel.name || 'Unknown Vessel';
    const position = vessel.position
      ? `${vessel.position.latitude.toFixed(5)}deg, ${vessel.position.longitude.toFixed(5)}deg`
      : 'unknown position';
    const speed = vessel.position?.sog !== undefined
      ? `${vessel.position.sog.toFixed(1)} knots`
      : 'unknown';
    const course = vessel.position?.cog !== undefined
      ? `${vessel.position.cog.toFixed(0)}deg`
      : 'unknown';

    const analysisPrompt = `Analyze vessel "${vesselName}" (MMSI: ${vessel.mmsi}):
- Current position: ${position}
- Speed: ${speed}
- Course: ${course}

Please provide collision risk assessment and navigation safety analysis.`;

    handleSendChatMessage(analysisPrompt);
  }, [handleSendChatMessage]);

  // Handle show vessel on map from AI
  const handleShowVesselOnMap = useCallback((mmsi: string) => {
    handleVesselSelect(mmsi);
    const vessel = vessels.get(mmsi);
    if (vessel?.position) {
      setCenterMapPosition({
        lat: vessel.position.latitude,
        lon: vessel.position.longitude,
      });
    }
  }, [handleVesselSelect, vessels]);

  // Cache for selected vessel info to persist when vessel leaves view
  const [cachedSelectedVessel, setCachedSelectedVessel] = useState<{
    mmsi: string;
    name: string;
    vesselType: number;
    callSign?: string;
    imoNumber?: number;
    destination?: string;
    eta?: string;
    draught?: number;
    dimensionA?: number;
    dimensionB?: number;
    dimensionC?: number;
    dimensionD?: number;
    position?: {
      latitude: number;
      longitude: number;
      sog: number;
      cog: number;
      trueHeading?: number;
      navStatus?: number;
      rateOfTurn?: number;
      timestamp: string;
    };
  } | null>(null);

  // Update cached vessel info when vessel is selected or updated
  useEffect(() => {
    if (!selectedVesselMmsi) {
      setCachedSelectedVessel(null);
      return;
    }

    const vessel = vessels.get(selectedVesselMmsi);
    if (vessel) {
      setCachedSelectedVessel({
        mmsi: vessel.mmsi,
        name: vessel.name || 'Unknown',
        vesselType: vessel.vessel_type || 0,
        callSign: vessel.call_sign,
        imoNumber: vessel.imo_number,
        destination: vessel.destination,
        eta: vessel.eta,
        draught: vessel.draught,
        dimensionA: vessel.dimension_a,
        dimensionB: vessel.dimension_b,
        dimensionC: vessel.dimension_c,
        dimensionD: vessel.dimension_d,
        position: vessel.position ? {
          latitude: vessel.position.latitude,
          longitude: vessel.position.longitude,
          sog: vessel.position.sog,
          cog: vessel.position.cog,
          trueHeading: vessel.position.true_heading,
          navStatus: vessel.position.navigational_status,
          rateOfTurn: vessel.position.rate_of_turn,
          timestamp: vessel.position.timestamp,
        } : undefined,
      });
    }
  }, [selectedVesselMmsi, vessels]);

  // Get selected vessel info for left function block - use cached version
  const selectedVesselInfo = cachedSelectedVessel;

  // Get fleet stats for gauges - Requirements: 6.1
  const fleetStats = useMemo(() => ({
    totalVessels: vessels.size,
    activeVessels: filteredVessels.length,
    trackedVessels: trackedVessels.length,
    databaseTotalVessels,
  }), [vessels.size, filteredVessels.length, trackedVessels.length, databaseTotalVessels]);

  // Get fleet status breakdown by navigational status
  const fleetStatusBreakdown = useMemo(() => {
    const vesselsArray = Array.from(vessels.values());
    const breakdown = {
      underway: 0,
      anchored: 0,
      moored: 0,
      fishing: 0,
      restricted: 0,
      notUnderCommand: 0,
      other: 0,
    };

    for (const vessel of vesselsArray) {
      const status = vessel.position?.navigational_status;
      switch (status) {
        case 0: // Under way using engine
        case 8: // Under way sailing
          breakdown.underway++;
          break;
        case 1: // At anchor
          breakdown.anchored++;
          break;
        case 5: // Moored
          breakdown.moored++;
          break;
        case 7: // Engaged in fishing
          breakdown.fishing++;
          break;
        case 2: // Not under command
          breakdown.notUnderCommand++;
          break;
        case 3: // Restricted maneuverability
        case 4: // Constrained by draught
          breakdown.restricted++;
          break;
        default:
          breakdown.other++;
      }
    }

    return breakdown;
  }, [vessels]);

  // Get nearby vessels for radar - Requirements: 8.3
  const radarVessels = useMemo(() => {
    if (!selectedVesselMmsi) return [];
    const selectedVessel = vessels.get(selectedVesselMmsi);
    if (!selectedVessel?.position) return [];

    return Array.from(vessels.values())
      .filter(v => v.position && v.mmsi !== selectedVesselMmsi)
      .map(v => ({
        mmsi: v.mmsi,
        name: v.name,
        latitude: v.position!.latitude,
        longitude: v.position!.longitude,
        sog: v.position!.sog,
        cog: v.position!.cog,
      }));
  }, [vessels, selectedVesselMmsi]);

  // Get center vessel for radar
  const centerVessel = useMemo(() => {
    if (!selectedVesselMmsi) return undefined;
    const vessel = vessels.get(selectedVesselMmsi);
    if (!vessel?.position) return undefined;

    return {
      mmsi: vessel.mmsi,
      name: vessel.name,
      latitude: vessel.position.latitude,
      longitude: vessel.position.longitude,
      sog: vessel.position.sog,
      cog: vessel.position.cog,
    };
  }, [vessels, selectedVesselMmsi]);

  // Get track history for track chart - Requirements: 7.1
  const trackHistory = useMemo(() => {
    return vesselTrack.map(pos => ({
      latitude: pos.latitude,
      longitude: pos.longitude,
      timestamp: pos.timestamp,
      sog: pos.sog,
      cog: pos.cog,
    }));
  }, [vesselTrack]);

  // Handle close vessel info
  const handleCloseVesselInfo = useCallback(() => {
    setSelectedVesselMmsi(null);
    setVesselTrack([]);
  }, []);

  // Handle center map on vessel
  const handleCenterMapOnVessel = useCallback((position: { lat: number; lon: number }) => {
    setCenterMapPosition(position);
  }, []);

  return (
    <CRTEffect
      enabled={effectsEnabled && !prefersReducedMotion}
      curvature={0.2}
      chromaticAberration={0.15}
      scanLineIntensity={0.04}
      phosphorGlow={0.25}
      vignetteIntensity={0.35}
    >
      <TerminalLayout
        aiPosition={aiPosition}
        onAIPositionChange={setAIPosition}
        statusBar={
          <StatusBar
            connectionStatus={databaseConnectionStatus}
            vesselCount={vessels.size}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            trackedVesselCount={trackedVessels.length}
            onFullscreenToggle={handleFullscreenToggle}
            isFullscreen={isFullscreen}
          />
        }
        leftBlock={
          <LeftFunctionBlock
            selectedVessel={selectedVesselInfo}
            viewportBounds={viewportBounds}
            colorScheme={colorScheme}
            fleetStats={fleetStats}
            fleetStatusBreakdown={fleetStatusBreakdown}
            onCloseVesselInfo={handleCloseVesselInfo}
            onCenterMap={handleCenterMapOnVessel}
            onTrack={(mmsi) => {
              const vessel = vessels.get(mmsi) || (cachedSelectedVessel?.mmsi === mmsi ? {
                mmsi: cachedSelectedVessel.mmsi,
                name: cachedSelectedVessel.name,
                position: cachedSelectedVessel.position ? {
                  latitude: cachedSelectedVessel.position.latitude,
                  longitude: cachedSelectedVessel.position.longitude,
                } : undefined,
              } : undefined);
              if (vessel?.position) {
                toggleContinuousTracking(
                  mmsi,
                  { lat: vessel.position.latitude, lon: vessel.position.longitude },
                  vessel.name
                );
              }
            }}
            onAnalysis={(mmsi) => {
              const vessel = vessels.get(mmsi);
              if (vessel) {
                handleSmartAnalysis(vessel);
              } else if (cachedSelectedVessel?.mmsi === mmsi) {
                // Use cached vessel data for analysis
                const analysisPrompt = `Analyze vessel "${cachedSelectedVessel.name}" (MMSI: ${cachedSelectedVessel.mmsi}):
- Current position: ${cachedSelectedVessel.position ? `${cachedSelectedVessel.position.latitude.toFixed(5)}deg, ${cachedSelectedVessel.position.longitude.toFixed(5)}deg` : 'unknown'}
- Speed: ${cachedSelectedVessel.position?.sog !== undefined ? `${cachedSelectedVessel.position.sog.toFixed(1)} knots` : 'unknown'}
- Course: ${cachedSelectedVessel.position?.cog !== undefined ? `${cachedSelectedVessel.position.cog.toFixed(0)}deg` : 'unknown'}

Please provide collision risk assessment and navigation safety analysis.`;
                handleSendChatMessage(analysisPrompt);
              }
            }}
            isVesselTracked={selectedVesselMmsi ? isVesselTracked(selectedVesselMmsi) : false}
          />
        }
        mainContent={
          <div className="relative w-full h-full">
            {/* Status Bar Panel Overlay */}
            {activePanel && (
              <TerminalPanels
                activePanel={activePanel}
                onClose={() => setActivePanel(null)}
                onFilterChange={handleFilterChange}
                onVesselClick={handleVesselClick}
                totalVessels={vessels.size}
                filteredVessels={filteredVessels.length}
                vessels={vessels}
                vesselArray={filteredVessels}
                selectedVesselMmsi={selectedVesselMmsi}
                searchQuery={filterCriteria.searchText}
                recentEntries={recentVessels}
                onRemoveRecentEntry={removeRecentVessel}
                onClearAllRecent={clearAllRecentVessels}
                trackedVessels={trackedVessels.map(v => ({
                  mmsi: v.mmsi,
                  name: v.name,
                  startedAt: v.startedAt || Date.now(),
                }))}
                currentTrackingMmsi={trackedVesselMmsi}
                onStopTracking={stopContinuousTracking}
                onStopAllTracking={stopAllTracking}
                mapCenter={mapCenter}
              />
            )}

            {/* Loading State */}
            {isLoading && vessels.size === 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div className="text-center" style={{ color: 'var(--terminal-fg)' }}>
                  <div className="text-lg font-mono uppercase tracking-wider">
                    LOADING VESSELS...
                  </div>
                  <div className="text-sm mt-2 opacity-70 font-mono">
                    SCANNING AREA
                  </div>
                </div>
              </div>
            )}

            {/* Track Loading Indicator */}
            {loadingTrack && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
                <div
                  className="px-4 py-2 font-mono text-sm uppercase"
                  style={{
                    backgroundColor: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-accent)',
                    color: 'var(--terminal-fg)',
                  }}
                >
                  [LOADING TRACK DATA...]
                </div>
              </div>
            )}

            {/* Track Unavailable Message */}
            {trackUnavailableMessage && !loadingTrack && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-md">
                <div
                  className="px-4 py-3 font-mono text-sm"
                  style={{
                    backgroundColor: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-dim)',
                    color: 'var(--terminal-dim)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span>[!]</span>
                    <span>{trackUnavailableMessage}</span>
                    <button
                      onClick={() => setTrackUnavailableMessage(null)}
                      className="ml-auto hover:opacity-80"
                      style={{ color: 'var(--terminal-fg)' }}
                    >
                      [X]
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && !isLoading && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-md">
                <ErrorDisplay
                  message={error.message || 'An error occurred'}
                  type="connection"
                  severity="error"
                  onDismiss={handleDismissError}
                  showTroubleshooting={true}
                />
              </div>
            )}

            {/* Map Component */}
            <MapComponent
              onVesselSelect={handleVesselSelectFromMap}
              selectedVesselMmsi={selectedVesselMmsi || undefined}
              vesselTrack={vesselTrack}
              autoConnect={false}
              vessels={vessels}
              centerOnPosition={centerMapPosition}
              visualizations={visualizations}
              onClearVisualizations={clearVisualizations}
              onCenteringFailed={handleCenteringFailed}
              onBoundsChange={setMapBounds}
              onMapCenterChange={setMapCenter}
              onPanningStateChange={setIsMapPanning}
              isLoadingVessels={isLoading}
            />
          </div>
        }
        rightBlock={
          <div className="flex flex-col p-2 gap-2" style={{ height: '100%', overflow: 'hidden' }}>
            {/* Track Chart - Requirements: 7.1 */}
            <TerminalWindow title="TRACK HISTORY" borderStyle="single">
              <TrackChart
                trackHistory={trackHistory}
                colorScheme={colorScheme}
                showGrid={true}
                showLabels={true}
                width={200}
                height={140}
              />
            </TerminalWindow>

            {/* Radar Scan - Requirements: 8.1 */}
            <TerminalWindow title="RADAR SCAN" borderStyle="single">
              <RadarScan
                centerVessel={centerVessel}
                nearbyVessels={radarVessels}
                range={10}
                colorScheme={colorScheme}
                sweepSpeed={30}
                showRangeRings={true}
                width={200}
                height={200}
              />
            </TerminalWindow>
          </div>
        }
        combinedBlock={
          <LeftFunctionBlock
            selectedVessel={selectedVesselInfo}
            viewportBounds={viewportBounds}
            colorScheme={colorScheme}
            fleetStats={fleetStats}
            fleetStatusBreakdown={fleetStatusBreakdown}
            onCloseVesselInfo={handleCloseVesselInfo}
            onCenterMap={handleCenterMapOnVessel}
            onTrack={(mmsi) => {
              const vessel = vessels.get(mmsi) || (cachedSelectedVessel?.mmsi === mmsi ? {
                mmsi: cachedSelectedVessel.mmsi,
                name: cachedSelectedVessel.name,
                position: cachedSelectedVessel.position ? {
                  latitude: cachedSelectedVessel.position.latitude,
                  longitude: cachedSelectedVessel.position.longitude,
                } : undefined,
              } : undefined);
              if (vessel?.position) {
                toggleContinuousTracking(
                  mmsi,
                  { lat: vessel.position.latitude, lon: vessel.position.longitude },
                  vessel.name
                );
              }
            }}
            onAnalysis={(mmsi) => {
              const vessel = vessels.get(mmsi);
              if (vessel) {
                handleSmartAnalysis(vessel);
              } else if (cachedSelectedVessel?.mmsi === mmsi) {
                const analysisPrompt = `Analyze vessel "${cachedSelectedVessel.name}" (MMSI: ${cachedSelectedVessel.mmsi}):
- Current position: ${cachedSelectedVessel.position ? `${cachedSelectedVessel.position.latitude.toFixed(5)}deg, ${cachedSelectedVessel.position.longitude.toFixed(5)}deg` : 'unknown'}
- Speed: ${cachedSelectedVessel.position?.sog !== undefined ? `${cachedSelectedVessel.position.sog.toFixed(1)} knots` : 'unknown'}
- Course: ${cachedSelectedVessel.position?.cog !== undefined ? `${cachedSelectedVessel.position.cog.toFixed(0)}deg` : 'unknown'}

Please provide collision risk assessment and navigation safety analysis.`;
                handleSendChatMessage(analysisPrompt);
              }
            }}
            isVesselTracked={selectedVesselMmsi ? isVesselTracked(selectedVesselMmsi) : false}
            rightBlockContent={
              <>
                {/* Track Chart - Requirements: 7.1 */}
                <TerminalWindow title="TRACK HISTORY" borderStyle="single">
                  <TrackChart
                    trackHistory={trackHistory}
                    colorScheme={colorScheme}
                    showGrid={true}
                    showLabels={true}
                    width={200}
                    height={120}
                  />
                </TerminalWindow>

                {/* Radar Scan - Requirements: 8.1 */}
                <TerminalWindow title="RADAR SCAN" borderStyle="single">
                  <RadarScan
                    centerVessel={centerVessel}
                    nearbyVessels={radarVessels}
                    range={10}
                    colorScheme={colorScheme}
                    sweepSpeed={30}
                    showRangeRings={true}
                    width={200}
                    height={160}
                  />
                </TerminalWindow>
              </>
            }
          />
        }
        terminalDialog={
          <TerminalAIDialog
            position={aiPosition}
            onPositionChange={setAIPosition}
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            onClearChat={clearChatMessages}
            isProcessing={isChatLoading}
            isConfigured={isAIConfigured}
            onShowVesselOnMap={handleShowVesselOnMap}
          />
        }
      />

      {/* Connection Toast */}
      <ConnectionToast status={connectionStatus} />
    </CRTEffect>
  );
}

/**
 * Main App Component
 * Wraps content with theme provider - Requirements: 10.1, 10.2
 */
function App() {
  return (
    <ErrorBoundary>
      <TerminalThemeProvider>
        <AppContent />
      </TerminalThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
