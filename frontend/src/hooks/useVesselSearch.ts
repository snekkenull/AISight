/**
 * useVesselSearch Hook
 *
 * Hook for searching vessels via backend API
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { VesselAPI } from '../services';
import type { VesselWithPosition } from '../types';
import { APP_CONFIG } from '../config';

interface UseVesselSearchReturn {
  searchResults: VesselWithPosition[];
  isSearching: boolean;
  searchError: string | null;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

/**
 * Hook for vessel search functionality
 */
export function useVesselSearch(): UseVesselSearchReturn {
  const [searchResults, setSearchResults] = useState<VesselWithPosition[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Search vessels by query string
   */
  const search = useCallback(async (query: string): Promise<void> => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        abortControllerRef.current = new AbortController();
        const results = await VesselAPI.searchVessels(query, 100);
        setSearchResults(results);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Search error:', error);
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, APP_CONFIG.searchDebounceDelay);
  }, []);

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    search,
    clearSearch,
  };
}
