import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldObservation, OrchardInspection, Weather } from '../src/fieldScout/domain';
import { appendTree, snapshotWeather, summarizeInspection } from '../src/fieldScout/inspection';
import { reportHtml, reportText } from '../src/fieldScout/report';

const now = Date.parse('2026-10-04T10:00:00Z');
const location = { latitude: 40.12345, longitude: 44.54321, source: 'gps' as const };
const item: FieldObservation = { schemaVersion: 1, id: 'tree1', crop: 'apricot', createdAt: new Date(now).toISOString(), imageUri: 'file:///private-photo.jpg',
  location, decision: 'possible', farmerNote: '', advisoryId: 'shot_hole_leaves', reviewStatus: 'not_requested', syncStatus: 'local',
  prediction: { conditionId: 'shot_hole_leaves', confidence: .9, margin: .7, modelId: 'test', modelVersion: '1', elapsedMs: 100 } };
const walk: OrchardInspection = { schemaVersion: 1, id: 'walk1', createdAt: item.createdAt, location, status: 'in_progress', note: '', observations: [] };
const weather: Weather = { location, fetchedAt: item.createdAt, source: 'open-meteo', hours: [{ time: new Date(now + 3600_000).toISOString(), temperature: 15, rain: 1, humidity: 80 }] };

test('Inspection never converts uncertain healthy-looking photos into healthy trees', () => {
  const healthy = { ...item, advisoryId: 'healthy', prediction: { ...item.prediction!, conditionId: 'healthy' } };
  assert.deepEqual(summarizeInspection([item, healthy, { ...healthy, decision: 'uncertain' }, { ...item, decision: 'unavailable', prediction: undefined }]),
    { suspicious: 1, noSymptoms: 1, inconclusive: 2 });
});
test('Five-tree boundary, duplicate prevention and completed inspection preserve original records', () => {
  let result = walk;
  for (let index = 0; index < 5; index++) result = appendTree(result, { ...item, id: `tree${index}` });
  assert.equal(walk.observations.length, 0);
  assert.throws(() => appendTree(result, { ...item, id: 'sixth' }));
  assert.throws(() => appendTree(appendTree(walk, item), item));
  assert.throws(() => appendTree({ ...walk, status: 'complete' }, item));
});
test('Weather snapshot excludes wrong location, stale/future downloads and exhausted forecasts', () => {
  const snapshot = snapshotWeather(weather, location, now)!;
  assert.ok(snapshot); weather.hours[0].rain = 7; assert.equal(snapshot.hours[0].rain, 1);
  assert.equal(snapshotWeather(weather, { ...location, latitude: 41 }, now), undefined);
  assert.equal(snapshotWeather({ ...weather, fetchedAt: new Date(now - 25 * 3600_000).toISOString() }, location, now), undefined);
  assert.equal(snapshotWeather({ ...weather, fetchedAt: new Date(now + 3600_000).toISOString() }, location, now), undefined);
  assert.equal(snapshotWeather(weather, location, now + 2 * 3600_000), undefined);
});
test('Report protects coordinates by default, includes evidence and labels forecast/demo honestly', () => {
  const inspection = { ...walk, observations: [item], weather: { ...weather, source: 'demo' as const }, note: 'Spots after rain' };
  const privateReport = reportText([item], 'en', false, inspection);
  assert.doesNotMatch(privateReport, /40\.12345|44\.54321|private-photo|file:\/\//);
  assert.match(privateReport, /DEMONSTRATION DATA/); assert.match(privateReport, /not observed weather/);
  assert.match(privateReport, /Spots after rain/); assert.match(privateReport, /90\.0%/);
  assert.match(privateReport, /not establish orchard disease prevalence/);
  assert.match(reportText([item], 'en', true, inspection), /40\.12345, 44\.54321/);
  assert.match(reportText([item], 'hy', false, inspection), /Դաշտային հաշվետվություն/);
  assert.match(reportText([item], 'en', false), /Possible shot hole/);
});
test('Report HTML embeds evidence without executing notes or requesting remote resources', () => {
  const html = reportHtml('<script>bad()</script> & note', [{ label: '<Tree>', base64: '/9j/AA==' }], 'en');
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>|https?:|file:\/\//);
  assert.match(html, /data:image\/jpeg;base64,\/9j\/AA==/);
  assert.throws(() => reportHtml('note', [{ label: 'Tree', base64: '" onerror="bad' }], 'en'));
});
