/**
 * useP5 Hook - P5.js React Integration
 * 
 * Requirements: 5.1
 * Provides a clean way to integrate P5.js sketches with React components.
 * Handles canvas creation, cleanup, and lifecycle management.
 */

import { useRef, useEffect, useCallback } from 'react';
import p5 from 'p5';

/**
 * P5.js sketch function type
 * Receives the p5 instance and should set up the sketch
 */
export type P5Sketch = (p: p5) => void;

/**
 * Options for the useP5 hook
 */
export interface UseP5Options {
  /** The sketch function that defines the P5.js behavior */
  sketch: P5Sketch;
  /** Dependencies that should trigger sketch recreation */
  dependencies?: unknown[];
}

/**
 * Return type for the useP5 hook
 */
export interface UseP5Return {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** The P5.js instance (null until mounted) */
  p5Instance: p5 | null;
}

/**
 * Hook to integrate P5.js with React
 * 
 * Creates a P5.js instance attached to a container element.
 * Automatically handles cleanup when the component unmounts or dependencies change.
 * 
 * @param options - Configuration options including the sketch function
 * @returns Object containing the container ref and P5 instance
 * 
 * @example
 * ```tsx
 * function MySketch() {
 *   const { containerRef } = useP5({
 *     sketch: (p) => {
 *       p.setup = () => {
 *         p.createCanvas(400, 400, p.WEBGL);
 *       };
 *       p.draw = () => {
 *         p.background(0);
 *         p.rotateY(p.frameCount * 0.01);
 *         p.sphere(100);
 *       };
 *     },
 *   });
 *   return <div ref={containerRef} />;
 * }
 * ```
 */
export function useP5({ sketch, dependencies = [] }: UseP5Options): UseP5Return {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  // Cleanup function to remove P5 instance
  const cleanup = useCallback(() => {
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't create instance if container doesn't exist
    if (!containerRef.current) return;

    // Clean up any existing instance
    cleanup();

    // Create new P5 instance attached to container
    p5InstanceRef.current = new p5(sketch, containerRef.current);

    // Cleanup on unmount or when dependencies change
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketch, cleanup, ...dependencies]);

  return {
    containerRef,
    p5Instance: p5InstanceRef.current,
  };
}

export default useP5;
