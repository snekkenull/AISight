/**
 * Tests for EmptyMapState component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyMapState } from './EmptyMapState';

describe('EmptyMapState', () => {
  it('should render default message', () => {
    render(<EmptyMapState />);
    
    expect(screen.getByText('No vessels loaded')).toBeInTheDocument();
    expect(screen.getByText(/Use the search and filter options/)).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<EmptyMapState message="Custom empty state message" />);
    
    expect(screen.getByText('Custom empty state message')).toBeInTheDocument();
  });

  it('should display map icon', () => {
    const { container } = render(<EmptyMapState />);
    
    expect(container.textContent).toContain('[MAP]');
  });

  it('should have proper styling classes', () => {
    const { container } = render(<EmptyMapState />);
    
    const emptyState = container.querySelector('.empty-map-state');
    expect(emptyState).toBeInTheDocument();
  });

  it('should display position data collection message', () => {
    render(<EmptyMapState />);
    
    expect(screen.getByText(/Position data is being collected/)).toBeInTheDocument();
    expect(screen.getByText(/Vessels will appear on the map as AIS position reports are received/)).toBeInTheDocument();
  });

  it('should display troubleshooting guidance by default', () => {
    render(<EmptyMapState />);
    
    expect(screen.getByText('Troubleshooting for Administrators:')).toBeInTheDocument();
    expect(screen.getByText(/Verify the AIS stream connection is active/)).toBeInTheDocument();
    expect(screen.getByText(/Check that position reports are being received/)).toBeInTheDocument();
    expect(screen.getByText(/Ensure the data pipeline is processing messages/)).toBeInTheDocument();
  });

  it('should display link to health endpoint', () => {
    render(<EmptyMapState />);
    
    const healthLink = screen.getByText(/View System Health Status/);
    expect(healthLink).toBeInTheDocument();
    expect(healthLink.closest('a')).toHaveAttribute('href', expect.stringContaining('/api/health'));
    expect(healthLink.closest('a')).toHaveAttribute('target', '_blank');
    expect(healthLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should hide troubleshooting guidance when showTroubleshooting is false', () => {
    render(<EmptyMapState showTroubleshooting={false} />);
    
    expect(screen.queryByText('Troubleshooting for Administrators:')).not.toBeInTheDocument();
    expect(screen.queryByText(/View System Health Status/)).not.toBeInTheDocument();
  });
});
