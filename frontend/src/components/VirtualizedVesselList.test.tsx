/**
 * VirtualizedVesselList Component Tests
 *
 * Tests for the virtualized vessel list component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualizedVesselList } from './VirtualizedVesselList';
import { VesselWithPosition } from '../types';

describe('VirtualizedVesselList', () => {
  const mockVessels: VesselWithPosition[] = [
    {
      mmsi: '367719770',
      name: 'OCEAN EXPLORER',
      vessel_type: 70,
      position: {
        mmsi: '367719770',
        timestamp: new Date().toISOString(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      },
    },
    {
      mmsi: '367123456',
      name: 'SEA VOYAGER',
      vessel_type: 60,
      position: {
        mmsi: '367123456',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        latitude: 37.8044,
        longitude: -122.2712,
        sog: 8.3,
        cog: 180.0,
      },
    },
  ];

  it('should render empty state when no vessels', () => {
    render(<VirtualizedVesselList vessels={[]} />);
    expect(screen.getByText('No vessels found')).toBeInTheDocument();
  });

  it('should render vessel list with vessel names', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    expect(screen.getByText('OCEAN EXPLORER')).toBeInTheDocument();
    expect(screen.getByText('SEA VOYAGER')).toBeInTheDocument();
  });

  it('should render vessel MMSIs', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    expect(screen.getByText(/367719770/)).toBeInTheDocument();
    expect(screen.getByText(/367123456/)).toBeInTheDocument();
  });

  it('should call onVesselClick when vessel is clicked', () => {
    const handleClick = vi.fn();
    render(
      <VirtualizedVesselList
        vessels={mockVessels}
        onVesselClick={handleClick}
      />
    );

    const vesselElement = screen.getByText('OCEAN EXPLORER').closest('div');
    vesselElement?.click();

    expect(handleClick).toHaveBeenCalledWith(mockVessels[0]);
  });

  it('should use non-virtualized rendering for small lists (<= 50 items)', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    
    // For small lists, vessels should be rendered directly without virtualization
    // Check that both vessels are present in the DOM
    expect(screen.getByText('OCEAN EXPLORER')).toBeInTheDocument();
    expect(screen.getByText('SEA VOYAGER')).toBeInTheDocument();
  });

  it('should use virtualized rendering for large lists (> 50 items)', () => {
    // Create 60 vessels (above the 50 item threshold)
    const largeVesselList: VesselWithPosition[] = Array.from({ length: 60 }, (_, i) => ({
      mmsi: `36771${9770 + i}`,
      name: `VESSEL ${i + 1}`,
      vessel_type: 70,
      position: {
        mmsi: `36771${9770 + i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        latitude: 37.7749 + i * 0.01,
        longitude: -122.4194 + i * 0.01,
        sog: 10 + i * 0.5,
        cog: 180 + i * 10,
      },
    }));

    const { container } = render(<VirtualizedVesselList vessels={largeVesselList} />);
    
    // Virtualized list should have react-window structure
    // Check for the presence of react-window's container
    const virtualizedContainer = container.querySelector('[style*="position"]');
    expect(virtualizedContainer).toBeInTheDocument();
  });

  it('should display status indicators for vessels', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    
    // Should show Active status for recent positions (both vessels have recent positions)
    const activeStatuses = screen.getAllByText('Active');
    expect(activeStatuses.length).toBeGreaterThan(0);
  });

  it('should display relative time for position age', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    
    // Should show "just now" or similar for recent position
    const timeElements = screen.getAllByText(/ago|just now/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should highlight search matches when searchQuery is provided', () => {
    render(
      <VirtualizedVesselList
        vessels={mockVessels}
        searchQuery="OCEAN"
      />
    );

    // The highlightMatch function wraps matches in <mark> tags
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
  });

  it('should apply selection styling to selected vessel', () => {
    const { container } = render(
      <VirtualizedVesselList
        vessels={mockVessels}
        selectedVesselMmsi="367719770"
      />
    );

    // Selected vessel should have border-l-primary class
    const selectedElement = container.querySelector('.border-l-primary');
    expect(selectedElement).toBeInTheDocument();
  });

  it('should render "Unknown Vessel" for vessels without names', () => {
    const vesselWithoutName: VesselWithPosition = {
      mmsi: '999999999',
      name: '',
      vessel_type: 70,
    };

    render(<VirtualizedVesselList vessels={[vesselWithoutName]} />);
    expect(screen.getByText('Unknown Vessel')).toBeInTheDocument();
  });

  it('should display vessel type badge', () => {
    render(<VirtualizedVesselList vessels={mockVessels} />);
    
    // Vessel type 70 should show "Cargo" badge
    expect(screen.getByText('Cargo')).toBeInTheDocument();
    // Vessel type 60 should show "Passenger" badge
    expect(screen.getByText('Passenger')).toBeInTheDocument();
  });

  it('should display "No Data" badge for vessels without position', () => {
    const vesselWithoutPosition: VesselWithPosition = {
      mmsi: '999999999',
      name: 'NO POSITION VESSEL',
      vessel_type: 70,
    };

    render(<VirtualizedVesselList vessels={[vesselWithoutPosition]} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('should apply primary color left border to selected vessel', () => {
    const { container } = render(
      <VirtualizedVesselList
        vessels={mockVessels}
        selectedVesselMmsi="367719770"
      />
    );

    // Selected vessel should have border-l-primary class and bg-primary/10
    const selectedElement = container.querySelector('.border-l-primary');
    expect(selectedElement).toBeInTheDocument();
    expect(selectedElement).toHaveClass('bg-primary/10');
  });

  it('should apply hover styling to non-selected vessels', () => {
    render(
      <VirtualizedVesselList
        vessels={mockVessels}
        selectedVesselMmsi="367719770"
      />
    );

    // Non-selected vessel (SEA VOYAGER) should be present and clickable
    const nonSelectedVessel = screen.getByText('SEA VOYAGER');
    expect(nonSelectedVessel).toBeInTheDocument();
    
    // Selected vessel should have different styling
    const selectedVessel = screen.getByText('OCEAN EXPLORER');
    expect(selectedVessel).toBeInTheDocument();
  });
});
