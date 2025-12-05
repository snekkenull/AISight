/**
 * SoundService - Terminal sound effects management
 * 
 * Requirements: 14.6, 14.7
 * - Implements audio playback for terminal effects
 * - Supports preloading sound files
 * - Implements volume control
 * - Respects user sound preference settings
 * - Mutes all audio feedback when disabled
 */

export type SoundEffect = 
  | 'click'
  | 'keystroke'
  | 'alert'
  | 'error'
  | 'blip'
  | 'radar-ping';

export interface SoundServiceConfig {
  enabled: boolean;
  volume: number;
}

const STORAGE_KEY = 'terminal-sound-preferences';

const DEFAULT_CONFIG: SoundServiceConfig = {
  enabled: true,
  volume: 0.3,
};

/**
 * Sound file paths - using Web Audio API generated sounds
 * since we don't have actual audio files
 */
const SOUND_FREQUENCIES: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType }> = {
  'click': { frequency: 1000, duration: 0.05, type: 'square' },
  'keystroke': { frequency: 800, duration: 0.03, type: 'square' },
  'alert': { frequency: 440, duration: 0.2, type: 'sawtooth' },
  'error': { frequency: 200, duration: 0.3, type: 'sawtooth' },
  'blip': { frequency: 1200, duration: 0.08, type: 'sine' },
  'radar-ping': { frequency: 600, duration: 0.15, type: 'sine' },
};

/**
 * SoundService class for managing terminal audio effects
 */
class SoundServiceImpl {
  private config: SoundServiceConfig;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): SoundServiceConfig {
    if (typeof window === 'undefined') {
      return DEFAULT_CONFIG;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CONFIG.enabled,
          volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_CONFIG.volume,
        };
      }
    } catch {
      // localStorage may not be available or data is corrupted
    }

    return DEFAULT_CONFIG;
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // localStorage may not be available
    }
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Preload sounds (initializes audio context)
   */
  public async preload(): Promise<void> {
    this.initAudioContext();
  }

  /**
   * Play a sound effect
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7
   */
  public play(effect: SoundEffect): void {
    // Respect user preference - don't play if disabled
    if (!this.config.enabled) {
      return;
    }

    // Initialize audio context on first play (requires user interaction)
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (!this.audioContext || !this.isInitialized) {
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {
        // Ignore resume errors
      });
    }

    const soundConfig = SOUND_FREQUENCIES[effect];
    if (!soundConfig) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = soundConfig.type;
      oscillator.frequency.setValueAtTime(soundConfig.frequency, this.audioContext.currentTime);

      // Apply volume with envelope for smoother sound
      const volume = this.config.volume * 0.3; // Scale down to avoid harsh sounds
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + soundConfig.duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
    } catch (error) {
      console.warn('Failed to play sound effect:', error);
    }
  }

  /**
   * Set whether sounds are enabled
   * Requirements: 14.6, 14.7
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  /**
   * Get whether sounds are enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set the volume level (0-1)
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  /**
   * Get the current volume level
   */
  public getVolume(): number {
    return this.config.volume;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): SoundServiceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const soundService = new SoundServiceImpl();

// Export class for testing
export { SoundServiceImpl as SoundService };

// Export storage key for testing
export { STORAGE_KEY as SOUND_STORAGE_KEY };
