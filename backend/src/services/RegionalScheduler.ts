/**
 * Regional Scheduler Service
 *
 * Manages AISStream subscription rotation across global regions
 * to ensure comprehensive vessel data collection over time.
 *
 * Strategy:
 * - Divides the world into regions
 * - Rotates through regions on a schedule
 * - Ensures all areas are covered within a cycle
 * - Supports on-demand region focus for searched vessels
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils';

/**
 * Geographic region definition
 */
export interface Region {
  id: string;
  name: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  priority: number; // Higher = more frequent updates
}

/**
 * Scheduler configuration
 */
export interface RegionalSchedulerConfig {
  /** Duration per region in milliseconds (default: 4 hours) */
  regionDurationMs: number;
  /** Whether to enable automatic rotation (default: true) */
  autoRotate: boolean;
  /** Custom regions (optional, uses defaults if not provided) */
  regions?: Region[];
}

/**
 * Scheduler status
 */
export interface SchedulerStatus {
  isRunning: boolean;
  currentRegion: Region | null;
  nextRegion: Region | null;
  nextRotationTime: Date | null;
  cycleProgress: number; // 0-100%
  regionsCompleted: number;
  totalRegions: number;
}

/**
 * Default global regions for comprehensive coverage
 */
const DEFAULT_REGIONS: Region[] = [
  {
    id: 'north-atlantic',
    name: 'North Atlantic',
    bounds: { minLat: 20, maxLat: 70, minLon: -80, maxLon: 0 },
    priority: 3, // High traffic area
  },
  {
    id: 'europe-mediterranean',
    name: 'Europe & Mediterranean',
    bounds: { minLat: 30, maxLat: 72, minLon: -10, maxLon: 45 },
    priority: 3,
  },
  {
    id: 'asia-pacific',
    name: 'Asia Pacific',
    bounds: { minLat: -10, maxLat: 50, minLon: 100, maxLon: 145 },
    priority: 3,
  },
  {
    id: 'middle-east-indian',
    name: 'Middle East & Indian Ocean',
    bounds: { minLat: -10, maxLat: 35, minLon: 45, maxLon: 100 },
    priority: 2,
  },
  {
    id: 'south-atlantic',
    name: 'South Atlantic',
    bounds: { minLat: -60, maxLat: 20, minLon: -70, maxLon: 20 },
    priority: 1,
  },
  {
    id: 'pacific-west',
    name: 'Pacific West',
    bounds: { minLat: -50, maxLat: 60, minLon: 145, maxLon: 180 },
    priority: 2,
  },
  {
    id: 'pacific-east',
    name: 'Pacific East',
    bounds: { minLat: -50, maxLat: 60, minLon: -180, maxLon: -100 },
    priority: 2,
  },
  {
    id: 'americas-west',
    name: 'Americas West Coast',
    bounds: { minLat: -60, maxLat: 70, minLon: -130, maxLon: -70 },
    priority: 2,
  },
  {
    id: 'polar-north',
    name: 'Arctic',
    bounds: { minLat: 65, maxLat: 90, minLon: -180, maxLon: 180 },
    priority: 1,
  },
  {
    id: 'polar-south',
    name: 'Antarctic',
    bounds: { minLat: -90, maxLat: -60, minLon: -180, maxLon: 180 },
    priority: 1,
  },
];

/**
 * Regional Scheduler Service
 */
export class RegionalScheduler extends EventEmitter {
  private logger = createComponentLogger('RegionalScheduler');
  private config: RegionalSchedulerConfig;
  private regions: Region[];
  private currentRegionIndex: number = 0;
  private rotationTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRotationTime: Date | null = null;

  constructor(config?: Partial<RegionalSchedulerConfig>) {
    super();
    this.config = {
      regionDurationMs: config?.regionDurationMs ?? 4 * 60 * 60 * 1000, // 4 hours default
      autoRotate: config?.autoRotate ?? true,
      regions: config?.regions,
    };
    this.regions = this.buildRotationSchedule(this.config.regions ?? DEFAULT_REGIONS);
  }

  /**
   * Build rotation schedule based on region priorities
   * Higher priority regions appear more frequently in the rotation
   */
  private buildRotationSchedule(regions: Region[]): Region[] {
    const schedule: Region[] = [];

    // Sort by priority (highest first)
    const sortedRegions = [...regions].sort((a, b) => b.priority - a.priority);

    // Add regions based on priority
    // Priority 3: appears 3 times per cycle
    // Priority 2: appears 2 times per cycle
    // Priority 1: appears 1 time per cycle
    for (const region of sortedRegions) {
      for (let i = 0; i < region.priority; i++) {
        schedule.push(region);
      }
    }

    // Shuffle to distribute high-priority regions throughout the cycle
    return this.shuffleArray(schedule);
  }

  /**
   * Fisher-Yates shuffle
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Start the scheduler
   * @param skipInitialEmit - If true, don't emit the initial regionChange event
   *                          (useful when the initial region was already applied before starting)
   */
  start(skipInitialEmit: boolean = false): void {
    if (this.isRunning) {
      this.logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Regional scheduler started', {
      totalRegions: this.regions.length,
      regionDurationMs: this.config.regionDurationMs,
      autoRotate: this.config.autoRotate,
      skipInitialEmit,
    });

    // Emit initial region (unless skipped)
    if (!skipInitialEmit) {
      this.emitCurrentRegion();
    }

    // Start rotation timer if auto-rotate is enabled
    if (this.config.autoRotate) {
      this.scheduleNextRotation();
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }

    this.logger.info('Regional scheduler stopped');
    this.emit('stopped');
  }

  /**
   * Get current region
   */
  getCurrentRegion(): Region {
    return this.regions[this.currentRegionIndex];
  }

  /**
   * Get next region in rotation
   */
  getNextRegion(): Region {
    const nextIndex = (this.currentRegionIndex + 1) % this.regions.length;
    return this.regions[nextIndex];
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    const currentRegion = this.getCurrentRegion();
    const nextRegion = this.getNextRegion();

    let nextRotationTime: Date | null = null;
    if (this.lastRotationTime && this.config.autoRotate) {
      nextRotationTime = new Date(
        this.lastRotationTime.getTime() + this.config.regionDurationMs
      );
    }

    const cycleProgress =
      this.regions.length > 0
        ? Math.round((this.currentRegionIndex / this.regions.length) * 100)
        : 0;

    return {
      isRunning: this.isRunning,
      currentRegion,
      nextRegion,
      nextRotationTime,
      cycleProgress,
      regionsCompleted: this.currentRegionIndex,
      totalRegions: this.regions.length,
    };
  }

  /**
   * Manually rotate to next region
   */
  rotateNow(): void {
    this.rotate();
  }

  /**
   * Focus on a specific region (for on-demand vessel search)
   * Temporarily switches to the region containing the given coordinates
   */
  focusOnLocation(latitude: number, longitude: number): Region | null {
    const region = this.findRegionForLocation(latitude, longitude);

    if (region) {
      this.logger.info('Focusing on region for location', {
        latitude,
        longitude,
        region: region.name,
      });

      // Find the region in our schedule
      const regionIndex = this.regions.findIndex((r) => r.id === region.id);
      if (regionIndex !== -1) {
        this.currentRegionIndex = regionIndex;
        this.emitCurrentRegion();

        // Reset rotation timer
        if (this.config.autoRotate && this.rotationTimer) {
          clearTimeout(this.rotationTimer);
          this.scheduleNextRotation();
        }
      }

      return region;
    }

    return null;
  }

  /**
   * Find which region contains a given location
   */
  findRegionForLocation(latitude: number, longitude: number): Region | null {
    // Use unique regions (not the rotation schedule)
    const uniqueRegions = this.config.regions ?? DEFAULT_REGIONS;

    for (const region of uniqueRegions) {
      const { minLat, maxLat, minLon, maxLon } = region.bounds;
      if (
        latitude >= minLat &&
        latitude <= maxLat &&
        longitude >= minLon &&
        longitude <= maxLon
      ) {
        return region;
      }
    }

    return null;
  }

  /**
   * Get all unique regions
   */
  getRegions(): Region[] {
    return this.config.regions ?? DEFAULT_REGIONS;
  }

  /**
   * Schedule next rotation
   */
  private scheduleNextRotation(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }

    this.rotationTimer = setTimeout(() => {
      this.rotate();
    }, this.config.regionDurationMs);

    this.lastRotationTime = new Date();
  }

  /**
   * Rotate to next region
   */
  private rotate(): void {
    this.currentRegionIndex = (this.currentRegionIndex + 1) % this.regions.length;

    // Check if we completed a full cycle
    if (this.currentRegionIndex === 0) {
      this.logger.info('Completed full rotation cycle');
      this.emit('cycleComplete');
    }

    this.emitCurrentRegion();

    if (this.config.autoRotate) {
      this.scheduleNextRotation();
    }
  }

  /**
   * Emit current region change event
   */
  private emitCurrentRegion(): void {
    const region = this.getCurrentRegion();
    this.logger.info('Switching to region', {
      region: region.name,
      bounds: region.bounds,
      index: this.currentRegionIndex,
      total: this.regions.length,
    });

    this.emit('regionChange', region);
  }
}
