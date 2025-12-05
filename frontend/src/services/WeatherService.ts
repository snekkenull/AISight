export interface MarineWeather {
  waveHeight: number;
  waveDirection: number;
  wavePeriod: number;
  windWaveHeight: number;
  swellWaveHeight: number;
  seaSurfaceTemp: number;
  oceanCurrentVelocity: number;
  oceanCurrentDirection: number;
  timestamp: string;
}

export class WeatherService {
  private static readonly BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';

  static async getMarineWeather(lat: number, lon: number): Promise<MarineWeather | null> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        current: [
          'wave_height',
          'wave_direction',
          'wave_period',
          'wind_wave_height',
          'swell_wave_height',
          'sea_surface_temperature',
          'ocean_current_velocity',
          'ocean_current_direction',
        ].join(','),
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      if (!response.ok) return null;

      const data = await response.json();
      const current = data.current;

      return {
        waveHeight: current.wave_height ?? 0,
        waveDirection: current.wave_direction ?? 0,
        wavePeriod: current.wave_period ?? 0,
        windWaveHeight: current.wind_wave_height ?? 0,
        swellWaveHeight: current.swell_wave_height ?? 0,
        seaSurfaceTemp: current.sea_surface_temperature ?? 0,
        oceanCurrentVelocity: current.ocean_current_velocity ?? 0,
        oceanCurrentDirection: current.ocean_current_direction ?? 0,
        timestamp: current.time,
      };
    } catch (error) {
      console.error('Failed to fetch marine weather:', error);
      return null;
    }
  }
}
