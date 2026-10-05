import test from 'node:test';
import assert from 'node:assert/strict';
import { carePlan } from '../src/fieldScout/care';
import { FieldObservation, Weather } from '../src/fieldScout/domain';
import { snapshotWeather } from '../src/fieldScout/inspection';
import { reportText } from '../src/fieldScout/report';
import { JsonObservationRepository } from '../src/fieldScout/repository';
import { getObservationAdvisory } from '../src/fieldScout/data/advisories';

const at = Date.parse('2026-10-05T10:00:00Z');
const location = { latitude: 40.12345, longitude: 44.54321, source: 'gps' as const };
const item: FieldObservation = { schemaVersion: 1, id: 'care-test', crop: 'apricot', createdAt: new Date(at).toISOString(), imageUri: 'file:///private.jpg', location,
  decision: 'possible', farmerNote: '', advisoryId: 'brown_rot', reviewStatus: 'not_requested', syncStatus: 'local' };
const weather: Weather = { location, fetchedAt: item.createdAt, source: 'open-meteo', hours: [{ time: new Date(at + 3600_000).toISOString(), temperature: 12, rain: 2, humidity: 80 }] };

test('Uncertain or unavailable observations never receive disease-specific care', () => {
  for (const advisoryId of ['healthy', 'brown_rot', 'shot_hole_leaves', 'shot_hole_fruit']) {
    const uncertain = carePlan({ ...item, advisoryId, decision: 'uncertain' });
    assert.equal(getObservationAdvisory({ ...item, advisoryId, decision: 'uncertain' }).id, 'uncertain');
    assert.match(uncertain.steps[0].title.en, /clearer photo/);
    assert.equal(uncertain.sourceUrl, undefined);
    const unavailable = carePlan({ ...item, advisoryId, decision: 'unavailable' });
    assert.equal(getObservationAdvisory({ ...item, advisoryId, decision: 'unavailable' }).id, 'unavailable');
    assert.match(unavailable.steps[0].title.en, /evidence/);
  }
});
test('Supported findings offer distinct bilingual care with primary sources and expert confirmation', () => {
  const brown = carePlan(item), shot = carePlan({ ...item, advisoryId: 'shot_hole_fruit' });
  assert.notDeepEqual(brown.steps, shot.steps);
  for (const plan of [brown, shot]) {
    assert.match(plan.sourceUrl!, /^https:\/\/ipm.ucanr.edu\//);
    assert.match(plan.steps.at(-1)!.title.en, /Confirm/);
    assert.ok(plan.steps.every(step => step.title.hy && step.detail.hy));
  }
});
test('Single checks preserve forecast snapshots across reload and readable reports keep coordinates opt-in', async () => {
  const snapshot = snapshotWeather(weather, location, at)!;
  const disk = new Map<string, string>();
  const store = { keys: async () => [...disk.keys()], read: async (key: string) => JSON.parse(disk.get(key)!), write: async (key: string, value: FieldObservation) => { disk.set(key, JSON.stringify(value)); } };
  await new JsonObservationRepository(store).save({ ...item, weather: snapshot });
  weather.hours[0].rain = 0;
  const [saved] = await new JsonObservationRepository(store).list();
  assert.equal(saved.weather?.hours[0].rain, 2);
  const report = reportText([saved], 'en', false);
  assert.match(report, /Open-Meteo/);
  assert.match(report, /Rain/);
  assert.match(report, /dried fruit/);
  assert.doesNotMatch(report, /40\.12345|44\.54321|file:\/\//);
  assert.match(reportText([saved], 'en', true), /40\.12345/);
  assert.ok(reportText([saved], 'hy', false).includes(carePlan(saved).steps[0].title.hy));
});
