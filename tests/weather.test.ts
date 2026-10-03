import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseForecast, sameLocation } from '../src/fieldScout/forecast';
import { evaluateRisk } from '../src/fieldScout/risk';
const midnight = Date.parse('2026-10-03T20:00:00Z') / 1000;
const location = { latitude: 40.15, longitude: 44.04 };
function response() {
  return { timezone: 'Asia/Yerevan', utc_offset_seconds: 14400,
    hourly: { time: Array.from({ length: 72 }, (_, i) => midnight + i * 3600),
      temperature_2m: Array(72).fill(15), precipitation: Array(72).fill(0), relative_humidity_2m: Array(72).fill(60) },
    daily: { time: [midnight, midnight + 86400, midnight + 172800], temperature_2m_min: [10, 11, 12], temperature_2m_max: [20, 21, 22], precipitation_sum: [0, 0, 0] } };
}
test('Forecast preserves real UTC hourly instants and orchard-local daily dates', () => {
  const weather = parseForecast(response(), location, new Date(midnight * 1000).toISOString());
  assert.equal(weather.hours[0].time, '2026-10-03T20:00:00.000Z');
  assert.deepEqual(weather.days?.map(day => day.date), ['2026-10-04', '2026-10-05', '2026-10-06']);
  assert.deepEqual(weather.location, location);
  assert.equal(weather.timezone, 'Asia/Yerevan');
});
test('Incomplete or malformed forecast is rejected instead of displaying false zero rain', () => {
  for (const bad of [null, {}, { ...response(), utc_offset_seconds: NaN }]) assert.throws(() => parseForecast(bad, location));
  const missing = response(); missing.hourly.precipitation[1] = null as unknown as number;
  assert.throws(() => parseForecast(missing, location));
  const invalid = response(); invalid.daily.temperature_2m_min[0] = 100;
  assert.throws(() => parseForecast(invalid, location));
});
test('Dry forecasts suggest soil inspection, rain switches advice, stale data gives no advice', () => {
  const now = midnight * 1000;
  const weather = parseForecast(response(), location, new Date(now).toISOString());
  assert.deepEqual(evaluateRisk(weather, now).map(r => r.id), ['soil-moisture']);
  weather.hours[5].rain = 2;
  assert.deepEqual(evaluateRisk(weather, now).map(r => r.id), ['moisture']);
  assert.deepEqual(evaluateRisk({ ...weather, fetchedAt: 'invalid' }, now), []);
  assert.deepEqual(evaluateRisk(weather, now + 25 * 3600000), []);
  assert.deepEqual(evaluateRisk({ ...weather, hours: weather.hours.slice(0, 2) }, now), []);
});
test('Forecast cache cannot be reused after changing orchard coordinates', () => {
  assert.equal(sameLocation(location, { ...location, source: 'gps' }), true);
  assert.equal(sameLocation(location, { ...location, latitude: 40.16 }), false);
});
