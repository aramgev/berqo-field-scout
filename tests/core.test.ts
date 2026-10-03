import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, rankLogits, validateMetadata } from '../src/fieldScout/safety';
import { getAdvisory, advisories } from '../src/fieldScout/data/advisories';
import { evaluateRisk } from '../src/fieldScout/risk';
import { en, hy } from '../src/fieldScout/i18n';
import { FieldObservation, ModelMetadata, Prediction, Weather } from '../src/fieldScout/domain';
import { ObservationSync } from '../src/fieldScout/sync';
import { JsonObservationRepository } from '../src/fieldScout/repository';
const meta: ModelMetadata = { modelId: 'apricot-test', version: '1', classes: ['healthy', 'brown_rot'], inputSize: 224,
  inputName: 'image', outputName: 'logits', inputLayout: 'NCHW', outputType: 'logits', mean: [.485, .456, .406], std: [.229, .224, .225],
  confidenceThreshold: .8, marginThreshold: .15, trainingSources: [], limitations: [] };
const prediction: Prediction = { conditionId: 'brown_rot', confidence: .88, margin: .6, modelId: 'apricot-test', modelVersion: '1', elapsedMs: 10 };
test('Safety rejects low confidence, ambiguity, malformed scores, unknown and unsupported classes', () => {
  assert.equal(decide(prediction, meta), 'possible');
  for (const override of [{ confidence: .7 }, { margin: .1 }, { confidence: NaN }, { confidence: 1.1 }, { margin: NaN }, { conditionId: 'banana' }, { conditionId: 'unknown' }]) {
    assert.equal(decide({ ...prediction, ...override }, meta), 'uncertain');
  }
});
test('Stable softmax does not overflow and refuses invalid output', () => {
  const ranked = rankLogits([10000, 10001]);
  assert.equal(ranked.index, 1); assert.ok(Math.abs(ranked.confidence - .731058) < .00001);
  assert.throws(() => rankLogits([NaN, 0])); assert.throws(() => rankLogits([1]));
});
test('Crop pack validates preprocessing and supported labels', () => {
  assert.equal(validateMetadata(meta), meta);
  for (const invalid of [{ inputSize: 128 }, { std: [1, 0, 1] }, { classes: ['healthy', 'healthy'] }, { classes: ['apple', 'healthy'] }]) {
    assert.throws(() => validateMetadata({ ...meta, ...invalid }));
  }
});
test('Advice always has safe fallback and local language text', () => {
  assert.equal(getAdvisory('nonexistent').id, 'uncertain');
  for (const advisory of Object.values(advisories)) for (const lang of ['en', 'hy'] as const) {
    assert.ok(advisory.title[lang]); assert.ok(advisory.summary[lang]);
    assert.doesNotMatch(advisory.summary[lang], /spray|dose|pesticide/i);
  }
});
test('Critical UI localization keys exist in both languages', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(hy).sort());
  for (const value of Object.values(hy)) assert.ok(value.length > 0);
});
const now = Date.parse('2026-10-03T12:00:00Z');
const weather: Weather = { fetchedAt: new Date(now).toISOString(), location: { latitude: 40, longitude: 44 }, source: 'open-meteo',
  hours: [{ time: new Date(now + 3600_000).toISOString(), temperature: -1, rain: 3, humidity: 90 }] };
test('Weather reminders use future hours only and suppress stale forecasts', () => {
  assert.deepEqual(evaluateRisk(weather, now).map(r => r.id), ['frost', 'moisture']);
  assert.equal(evaluateRisk({ ...weather, fetchedAt: new Date(now - 25 * 3600_000).toISOString() }, now).length, 0);
  assert.equal(evaluateRisk({ ...weather, hours: [{ ...weather.hours[0], time: new Date(now - 3600_000).toISOString() }] }, now).length, 0);
  assert.ok(evaluateRisk({ ...weather, source: 'demo' }, now).every(r => r.demo));
});
const observation: FieldObservation = { schemaVersion: 1, id: 'test-1', crop: 'apricot', createdAt: new Date(now).toISOString(), imageUri: 'file:///test.jpg', decision: 'uncertain', farmerNote: '', advisoryId: 'uncertain', reviewStatus: 'queued_for_review', syncStatus: 'queued' };
test('Passport serialization survives repository recreation and persists photo/model/queue state', async () => {
  const disk = new Map<string, string>();
  const store = { keys: async () => [...disk.keys()], read: async (key: string) => JSON.parse(disk.get(key)!),
    write: async (key: string, item: FieldObservation) => { disk.set(key, JSON.stringify(item)); } };
  await new JsonObservationRepository(store).save({ ...observation, prediction, farmerNote: 'Tree 12' });
  const restarted = new JsonObservationRepository(store);
  const [saved] = await restarted.list();
  assert.equal(saved.imageUri, observation.imageUri); assert.equal(saved.prediction?.modelVersion, '1');
  assert.equal(saved.farmerNote, 'Tree 12'); assert.equal(saved.syncStatus, 'queued'); assert.equal(saved.reviewStatus, 'queued_for_review');
  await restarted.save({ ...saved, syncStatus: 'failed' });
  assert.equal((await new JsonObservationRepository(store).list())[0].syncStatus, 'failed');
  await assert.rejects(restarted.save({ ...observation, id: '../escape' }));
});
test('Sync failure persists and retry succeeds without pretending demo expert review was sent', async () => {
  let record = { ...observation };
  const repo = { list: async () => [{ ...record }], save: async (item: FieldObservation) => { record = { ...item }; } };
  const failing = new ObservationSync(repo, { send: async () => { throw new Error('No connection'); } });
  await failing.run(); assert.equal(record.syncStatus, 'failed'); assert.match(record.syncError!, /No connection/);
  const success = new ObservationSync(repo, { send: async () => ({ receiptId: 'test-1', reviewAccepted: false }) });
  await success.run(); assert.equal(record.syncStatus, 'synced'); assert.equal(record.reviewStatus, 'queued_for_review'); assert.equal(record.syncError, undefined);
});
test('Only explicit real adapter acceptance submits expert review; local records are not sent', async () => {
  let record = { ...observation };
  let calls = 0;
  const repo = { list: async () => [{ ...record }], save: async (item: FieldObservation) => { record = { ...item }; } };
  const sync = new ObservationSync(repo, { send: async () => { calls++; return { receiptId: 'real', reviewAccepted: true }; } });
  await sync.run(); assert.equal(record.reviewStatus, 'submitted');
  record.syncStatus = 'local'; await sync.run(); assert.equal(calls, 1);
});
