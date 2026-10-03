import { Location, Weather } from './domain';

export function sameLocation(a: Location, b: Location) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

// Unix hourly times are UTC instants; daily dates need the forecast's UTC offset.
export function parseForecast(body: unknown, location: Location, fetchedAt = new Date().toISOString()): Weather {
  const data = body as { timezone: string; utc_offset_seconds: number;
    hourly: { time: number[]; temperature_2m: number[]; precipitation: number[]; relative_humidity_2m: number[] };
    daily: { time: number[]; temperature_2m_min: number[]; temperature_2m_max: number[]; precipitation_sum: number[] } };
  if (!Array.isArray(data?.hourly?.time) || !data.hourly.time.length || !Array.isArray(data.daily?.time)
    || data.daily.time.length !== 3 || !Number.isFinite(data.utc_offset_seconds) || typeof data.timezone !== 'string') throw new Error('Incomplete forecast');
  const hours = data.hourly.time.map((time, i) => {
    const temperature = data.hourly.temperature_2m?.[i], rain = data.hourly.precipitation?.[i], humidity = data.hourly.relative_humidity_2m?.[i];
    if (![time, temperature, rain, humidity].every(Number.isFinite) || rain < 0 || humidity < 0 || humidity > 100) throw new Error('Incomplete forecast');
    return { time: new Date(time * 1000).toISOString(), temperature, rain, humidity };
  });
  const days = data.daily.time.map((time, i) => {
    const minimum = data.daily.temperature_2m_min?.[i], maximum = data.daily.temperature_2m_max?.[i], rain = data.daily.precipitation_sum?.[i];
    if (![time, minimum, maximum, rain].every(Number.isFinite) || minimum > maximum || rain < 0) throw new Error('Incomplete forecast');
    return { date: new Date((time + data.utc_offset_seconds) * 1000).toISOString().slice(0, 10), minimum, maximum, rain };
  });
  return { fetchedAt, location: { ...location }, source: 'open-meteo', timezone: data.timezone, hours, days };
}
