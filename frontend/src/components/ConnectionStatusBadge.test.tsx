/**
 * ConnectionStatusBadge Component Tests
 *
 * Unit tests for the ConnectionStatusBadge component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import type { ConnectionStatus } from '../types';

describe('ConnectionStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with connected status', () => {
    render(<ConnectionStatusBadge status="connected" />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    // Get the visible status badge (not the sr-only one)
    const statusElements = screen.getAllByRole('status');
    const visibleStatus = statusElements.find(el => el.getAttribute('aria-label'));
    expect(visibleStatus).toHaveAttribute(
      'aria-label',
      'Connection status: Connected'
    );
  });

  it('should render with disconnected status', () => {
    render(<ConnectionStatusBadge status="disconnected" />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render with connecting status', () => {
    render(<ConnectionStatusBadge status="connecting" />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should render with error status', () => {
    render(<ConnectionStatusBadge status="error" />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should show toast notification when transitioning to disconnected', async () => {
    const { rerender } = render(<ConnectionStatusBadge status="connected" />);
    
    // Transition to disconnected
    rerender(<ConnectionStatusBadge status="disconnected" />);
    
    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument();
    });
  });

  it('should not show toast on initial disconnected state', () => {
    render(<ConnectionStatusBadge status="disconnected" />);
    
    // Toast should not appear on initial render
    expect(screen.queryByText('Connection lost. Reconnecting...')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ConnectionStatusBadge status="connected" className="custom-class" />
    );
    
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ConnectionStatusBadge status="connected" />);
    
    // Should have multiple status elements (visible badge + sr-only announcement)
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBe(2);
    
    // At least one should have aria-live="polite" (the sr-only one)
    const liveRegion = statusElements.find(el => el.getAttribute('aria-live') === 'polite');
    expect(liveRegion).toBeTruthy();
    
    // The visible badge should have aria-label
    const visibleBadge = statusElements.find(el => el.getAttribute('aria-label'));
    expect(visibleBadge).toBeTruthy();
  });

  describe('Status color mapping', () => {
    const statusColors: Array<[ConnectionStatus, string]> = [
      ['connected', 'bg-green-500'],
      ['disconnected', 'bg-red-500'],
      ['connecting', 'bg-amber-500'],
      ['error', 'bg-red-500'],
    ];

    it.each(statusColors)(
      'should display correct color for %s status',
      (status, expectedColorClass) => {
        const { container } = render(<ConnectionStatusBadge status={status} />);
        
        const dot = container.querySelector(`.${expectedColorClass}`);
        expect(dot).toBeTruthy();
      }
    );
  });
});
