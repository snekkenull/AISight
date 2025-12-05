import { useState, useEffect } from 'react';
import { EvaCounter, EvaHighlight } from './ui/eva-effects';

/**
 * VesselCountOverlay Component
 * 
 * Displays vessel count with EVA styling
 * Requirements: 5.2, 6.1, 12.1, 12.3
 * - EVA counter animation
 * - HUD appearance with technical readout styling
 * - Highlight animation on data updates
 */

interface VesselCountOverlayProps {
  count: number;
}

export function VesselCountOverlay({ count }: VesselCountOverlayProps) {
  const [highlightTrigger, setHighlightTrigger] = useState(false);

  // Trigger highlight animation when count changes
  useEffect(() => {
    if (count > 0) {
      setHighlightTrigger(prev => !prev);
    }
  }, [count]);

  return (
    <EvaHighlight trigger={highlightTrigger} color="cyan" duration={800}>
      <div 
        className="absolute bottom-8 left-4 z-[400] bg-eva-bg-secondary/95 backdrop-blur-sm border-2 border-eva-border-accent px-4 py-2 shadow-lg font-eva-mono"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          boxShadow: '0 0 20px rgba(255, 102, 0, 0.3)',
        }}
      >
      {/* Corner brackets decoration */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-eva-accent-orange" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-eva-accent-orange" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-eva-accent-orange" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-eva-accent-orange" />
      
        <p className="text-xs uppercase tracking-wide">
          <span className="text-eva-text-secondary">[VESSELS IN AREA]</span>
          {' '}
          <span className="text-eva-accent-orange font-bold text-sm">
            <EvaCounter value={count} format={(n) => n.toLocaleString()} />
          </span>
        </p>
      </div>
    </EvaHighlight>
  );
}
