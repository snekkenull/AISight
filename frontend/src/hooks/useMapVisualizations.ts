/**
 * useMapVisualizations Hook
 * 
 * Manages map visualization state for AI analysis results.
 * Provides methods to add, remove, and clear visualizations.
 * Auto-cleanup after timeout.
 * 
 * Requirements: 10.5
 */

import { useState, useCallback, useEffect } from 'react';
import type { MapVisualization } from '../types';

/**
 * Configuration for visualization auto-cleanup
 */
const VISUALIZATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VISUALIZATIONS = 10;

/**
 * Visualization with timeout tracking
 */
interface VisualizationWithTimeout extends MapVisualization {
  timeoutId: NodeJS.Timeout;
  createdAt: number;
}

/**
 * Hook return type
 */
export interface UseMapVisualizationsReturn {
  visualizations: MapVisualization[];
  addVisualization: (viz: MapVisualization) => void;
  removeVisualization: (id: string) => void;
  clearAll: () => void;
  count: number;
}

/**
 * useMapVisualizations Hook
 * 
 * Manages visualization state with auto-cleanup
 */
export function useMapVisualizations(): UseMapVisualizationsReturn {
  const [visualizationsMap, setVisualizationsMap] = useState<Map<string, VisualizationWithTimeout>>(
    new Map()
  );

  /**
   * Add a new visualization
   * Automatically removes oldest if max limit reached
   */
  const addVisualization = useCallback((viz: MapVisualization) => {
    setVisualizationsMap((prev) => {
      const updated = new Map(prev);
      
      // Remove oldest visualization if at max limit
      if (updated.size >= MAX_VISUALIZATIONS) {
        const oldestId = Array.from(updated.entries())
          .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0]?.[0];
        
        if (oldestId) {
          const oldest = updated.get(oldestId);
          if (oldest) {
            clearTimeout(oldest.timeoutId);
          }
          updated.delete(oldestId);
        }
      }
      
      // Clear existing timeout if visualization already exists
      const existing = updated.get(viz.id);
      if (existing) {
        clearTimeout(existing.timeoutId);
      }
      
      // Create timeout for auto-cleanup
      const timeoutId = setTimeout(() => {
        setVisualizationsMap((current) => {
          const newMap = new Map(current);
          newMap.delete(viz.id);
          return newMap;
        });
      }, VISUALIZATION_TIMEOUT_MS);
      
      // Add visualization with timeout
      updated.set(viz.id, {
        ...viz,
        timeoutId,
        createdAt: Date.now(),
      });
      
      return updated;
    });
  }, []);

  /**
   * Remove a specific visualization
   */
  const removeVisualization = useCallback((id: string) => {
    setVisualizationsMap((prev) => {
      const updated = new Map(prev);
      const viz = updated.get(id);
      
      if (viz) {
        clearTimeout(viz.timeoutId);
        updated.delete(id);
      }
      
      return updated;
    });
  }, []);

  /**
   * Clear all visualizations
   */
  const clearAll = useCallback(() => {
    setVisualizationsMap((prev) => {
      // Clear all timeouts
      prev.forEach((viz) => {
        clearTimeout(viz.timeoutId);
      });
      
      return new Map();
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      visualizationsMap.forEach((viz) => {
        clearTimeout(viz.timeoutId);
      });
    };
  }, [visualizationsMap]);

  /**
   * Convert map to array for rendering
   */
  const visualizations: MapVisualization[] = Array.from(visualizationsMap.values()).map(
    ({ timeoutId, createdAt, ...viz }) => viz
  );

  return {
    visualizations,
    addVisualization,
    removeVisualization,
    clearAll,
    count: visualizations.length,
  };
}
