/**
 * Formatting Utility Functions
 *
 * This file contains utility functions for formatting data for display,
 * including relative time formatting and text highlighting.
 */

import React from 'react';

/**
 * Format speed in knots
 */
export function formatSpeed(sog: number | undefined): string {
  if (sog === undefined || sog === null) return 'N/A';
  return `${sog.toFixed(1)} kt`;
}

/**
 * Format course in degrees
 */
export function formatCourse(cog: number | undefined): string {
  if (cog === undefined || cog === null) return 'N/A';
  return `${Math.round(cog)}°`;
}

/**
 * Format a timestamp as relative time (e.g., "2m ago", "1h ago", "3d ago")
 *
 * Handles edge cases:
 * - Future dates: returns "just now"
 * - Very old dates (> 30 days): returns "30+ days ago"
 * - Invalid dates: returns "unknown"
 *
 * @param timestamp - The timestamp to format (Date object or ISO string)
 * @returns Human-readable relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 120000)) // "2m ago"
 * formatRelativeTime(new Date(Date.now() - 7200000)) // "2h ago"
 * formatRelativeTime(new Date(Date.now() - 172800000)) // "2d ago"
 * ```
 */
export function formatRelativeTime(timestamp: Date | string): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    // Check for invalid date
    if (isNaN(date.getTime())) {
      return 'unknown';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Handle future dates
    if (diffMs < 0) {
      return 'just now';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Less than 1 minute
    if (diffSeconds < 60) {
      return 'just now';
    }

    // Less than 1 hour
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Less than 30 days
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }

    // 30 days or more
    return '30+ days ago';
  } catch (error) {
    console.warn('Failed to format relative time:', error);
    return 'unknown';
  }
}

/**
 * Highlight matching text in a string
 *
 * Takes a text string and a search query, and returns JSX with the matching
 * portions wrapped in a <mark> element for highlighting.
 *
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns JSX with highlighted matches, or the original text if no match
 *
 * @example
 * ```tsx
 * highlightMatch("Cargo Ship", "cargo") 
 * // Returns: <><mark className="bg-yellow-200">Cargo</mark> Ship</>
 * 
 * highlightMatch("MMSI: 123456", "234")
 * // Returns: <>MMSI: 1<mark className="bg-yellow-200">234</mark>56</>
 * ```
 */
export function highlightMatch(
  text: string,
  query: string
): React.ReactNode {
  // If no query or no text, return original text
  if (!query || !text) {
    return text;
  }

  // Case-insensitive search
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  // No match found
  if (index === -1) {
    return text;
  }

  // Split text into parts: before match, match, after match
  const beforeMatch = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const afterMatch = text.slice(index + query.length);

  return React.createElement(
    React.Fragment,
    null,
    beforeMatch,
    React.createElement(
      'mark',
      { className: 'bg-yellow-200 dark:bg-yellow-600 text-text-primary font-medium rounded px-0.5' },
      match
    ),
    afterMatch
  );
}
