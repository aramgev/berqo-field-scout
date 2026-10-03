import { Location, Weather, WeatherService } from '../domain';
import { readJson, root, writeJson } from './storage';
import { parseForecast } from '../forecast';
export class OpenMeteoWeather implements WeatherService {
  cached() { return readJson<Weather>(`${root}weather.json`); }
  async refresh(location: Location): Promise<Weather> {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
      || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) throw new Error('Invalid coordinates');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&forecast_days=3&timezone=auto&timeformat=unixtime`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Weather service: ${response.status}`);
      const weather = parseForecast(await response.json(), location);
      await writeJson(`${root}weather.json`, weather);
      return weather;
    } finally { clearTimeout(timeout); }
  }
}
export function demoWeather(location: Location): Weather {
  return { fetchedAt: new Date().toISOString(), location, source: 'demo', hours:
    [1, 6, 12, 24].map((h, i) => ({ time: new Date(Date.now() + h * 3600_000).toISOString(), temperature: i === 0 ? -1 : 15, rain: i === 1 ? 2 : 0, humidity: 85 })) };
}
