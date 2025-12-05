import { useEffect, useState } from 'react';
import { Waves, Wind, Thermometer, Navigation, Droplets, RefreshCw, MapPin } from 'lucide-react';
import { WeatherService, MarineWeather } from '../../services/WeatherService';

interface WeatherCardProps {
  latitude?: number;
  longitude?: number;
}

export function WeatherCard({ latitude, longitude }: WeatherCardProps) {
  const [weather, setWeather] = useState<MarineWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWeather = async () => {
    if (!latitude || !longitude) return;
    setLoading(true);
    const data = await WeatherService.getMarineWeather(latitude, longitude);
    setWeather(data);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (!latitude || !longitude) return;
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const getSeaState = (height: number) => {
    if (height < 0.1) return { state: 'CALM', emoji: '▬', color: '#00FF41', bgColor: 'rgba(0, 255, 65, 0.1)' };
    if (height < 0.5) return { state: 'SMOOTH', emoji: '≈', color: '#00D4FF', bgColor: 'rgba(0, 212, 255, 0.1)' };
    if (height < 1.25) return { state: 'SLIGHT', emoji: '≋', color: '#00D4FF', bgColor: 'rgba(0, 212, 255, 0.1)' };
    if (height < 2.5) return { state: 'MODERATE', emoji: '≈≈', color: '#9400D3', bgColor: 'rgba(148, 0, 211, 0.1)' };
    if (height < 4) return { state: 'ROUGH', emoji: '⚠', color: '#FF6600', bgColor: 'rgba(255, 102, 0, 0.1)' };
    if (height < 6) return { state: 'VERY ROUGH', emoji: '⚠⚠', color: '#FF6600', bgColor: 'rgba(255, 102, 0, 0.1)' };
    return { state: 'HIGH', emoji: '⚠⚠⚠', color: '#DC143C', bgColor: 'rgba(220, 20, 60, 0.1)' };
  };

  // Loading state
  if (loading && !weather) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-eva-bg-tertiary border border-eva-border-accent animate-pulse flex items-center justify-center" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
          <RefreshCw className="h-6 w-6 text-eva-accent-orange animate-spin" />
        </div>
      </div>
    );
  }

  // No location state
  if (!weather) {
    return (
      <div className="space-y-4">
        <div className="bg-eva-bg-tertiary border border-eva-border-default p-6 text-center" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
          <div className="w-16 h-16 bg-eva-accent-orange/10 flex items-center justify-center mx-auto mb-4" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
            <MapPin className="h-8 w-8 text-eva-accent-orange/50" />
          </div>
          <p className="text-sm font-medium text-eva-text-primary uppercase tracking-wide">No Location</p>
          <p className="text-xs text-eva-text-secondary mt-1">Move the map to load sea conditions</p>
        </div>
      </div>
    );
  }

  const seaState = getSeaState(weather.waveHeight);

  return (
    <div className="space-y-4">
      {/* Main Weather Card - HUD Style */}
      <div className={`relative overflow-hidden p-5 border-2`} style={{ 
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        backgroundColor: seaState.bgColor,
        borderColor: seaState.color
      }}>
        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: seaState.color }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: seaState.color }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: seaState.color }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: seaState.color }} />

        {/* Header */}
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-eva-text-secondary font-medium uppercase tracking-wider">[SEA STATE]</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-mono" style={{ color: seaState.color }}>{seaState.emoji}</span>
              <h3 className="text-2xl font-bold uppercase tracking-wider" style={{ color: seaState.color }}>
                {seaState.state}
              </h3>
            </div>
          </div>
          <button 
            onClick={fetchWeather}
            disabled={loading}
            className="p-2 hover:bg-eva-bg-tertiary transition-colors" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
          >
            <RefreshCw className={`h-4 w-4 text-eva-accent-orange ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Wave Height - Large Display */}
        <div className="relative flex items-end gap-1 mb-4">
          <span className="text-5xl font-light tracking-tight tabular-nums text-eva-text-primary">{weather.waveHeight.toFixed(1)}</span>
          <span className="text-xl text-eva-text-secondary mb-2 uppercase">m</span>
        </div>

        {/* Wave Details */}
        {(weather.windWaveHeight > 0 || weather.swellWaveHeight > 0) && (
          <div className="relative flex gap-4 text-xs text-eva-text-secondary uppercase tracking-wide">
            {weather.windWaveHeight > 0 && (
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                Wind [{weather.windWaveHeight.toFixed(1)}m]
              </span>
            )}
            {weather.swellWaveHeight > 0 && (
              <span className="flex items-center gap-1">
                <Waves className="h-3 w-3" />
                Swell [{weather.swellWaveHeight.toFixed(1)}m]
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid - HUD Data Readouts */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wave Period */}
        <div className="bg-eva-bg-tertiary border border-eva-border-default p-3.5 hover:bg-eva-bg-secondary hover:border-eva-accent-cyan transition-colors" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-eva-accent-cyan/10 flex items-center justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
              <Waves className="h-4 w-4 text-eva-accent-cyan" />
            </div>
          </div>
          <p className="text-xs text-eva-text-secondary uppercase tracking-wide">[Wave Period]</p>
          <p className="text-lg font-semibold text-eva-text-primary tabular-nums">{weather.wavePeriod.toFixed(0)}<span className="text-sm font-normal text-eva-text-secondary ml-0.5">s</span></p>
        </div>

        {/* Sea Temperature */}
        <div className="bg-eva-bg-tertiary border border-eva-border-default p-3.5 hover:bg-eva-bg-secondary hover:border-eva-accent-orange transition-colors" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-eva-accent-orange/10 flex items-center justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
              <Thermometer className="h-4 w-4 text-eva-accent-orange" />
            </div>
          </div>
          <p className="text-xs text-eva-text-secondary uppercase tracking-wide">[Sea Temp]</p>
          <p className="text-lg font-semibold text-eva-text-primary tabular-nums">{weather.seaSurfaceTemp.toFixed(1)}<span className="text-sm font-normal text-eva-text-secondary ml-0.5">°C</span></p>
        </div>

        {/* Ocean Current */}
        {weather.oceanCurrentVelocity > 0 && (
          <div className="bg-eva-bg-tertiary border border-eva-border-default p-3.5 hover:bg-eva-bg-secondary hover:border-eva-accent-cyan transition-colors" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-eva-accent-cyan/10 flex items-center justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                <Navigation 
                  className="h-4 w-4 text-eva-accent-cyan" 
                  style={{ transform: `rotate(${weather.oceanCurrentDirection}deg)` }} 
                />
              </div>
            </div>
            <p className="text-xs text-eva-text-secondary uppercase tracking-wide">[Current]</p>
            <p className="text-lg font-semibold text-eva-text-primary tabular-nums">{weather.oceanCurrentVelocity.toFixed(1)}<span className="text-sm font-normal text-eva-text-secondary ml-0.5">km/h</span></p>
          </div>
        )}

        {/* Wave Direction */}
        <div className="bg-eva-bg-tertiary border border-eva-border-default p-3.5 hover:bg-eva-bg-secondary hover:border-eva-accent-purple transition-colors" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-eva-accent-purple/10 flex items-center justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
              <Droplets className="h-4 w-4 text-eva-accent-purple" />
            </div>
          </div>
          <p className="text-xs text-eva-text-secondary uppercase tracking-wide">[Direction]</p>
          <p className="text-lg font-semibold text-eva-text-primary tabular-nums">{weather.waveDirection.toFixed(0)}<span className="text-sm font-normal text-eva-text-secondary ml-0.5">°</span></p>
        </div>
      </div>

      {/* Footer - Last Update */}
      <div className="flex items-center justify-center gap-2 text-xs text-eva-text-secondary uppercase tracking-wide">
        <div className="w-1.5 h-1.5 bg-eva-accent-green animate-pulse" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />
        <span>[Updated {lastUpdate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}]</span>
      </div>
    </div>
  );
}
