import { ModelMetadata, Prediction } from './domain';
import { advisories } from './data/advisories';
export function decide(prediction: Prediction, metadata: ModelMetadata): 'possible' | 'uncertain' {
  return Number.isFinite(prediction.confidence) && Number.isFinite(prediction.margin)
    && prediction.confidence >= metadata.confidenceThreshold
    && prediction.confidence <= 1 && prediction.margin >= metadata.marginThreshold
    && prediction.margin <= 1 && prediction.conditionId !== 'unknown'
    && metadata.classes.includes(prediction.conditionId) && !!advisories[prediction.conditionId]
    ? 'possible' : 'uncertain';
}
export function rankLogits(logits: ArrayLike<number>): { index: number; confidence: number; margin: number } {
  const values = Array.from(logits);
  if (values.length < 2 || values.some(v => !Number.isFinite(v))) throw new Error('Invalid model output');
  const max = Math.max(...values);
  const exponentials = values.map(v => Math.exp(v - max));
  const sum = exponentials.reduce((a, b) => a + b, 0);
  const ranked = exponentials.map((v, index) => ({ index, p: v / sum })).sort((a, b) => b.p - a.p);
  return { index: ranked[0].index, confidence: ranked[0].p, margin: ranked[0].p - ranked[1].p };
}
export function validateMetadata(value: unknown): ModelMetadata {
  const m = value as ModelMetadata;
  if (!m || typeof m.modelId !== 'string' || typeof m.version !== 'string'
    || !Array.isArray(m.classes) || m.classes.length < 2 || m.classes.length > 20
    || m.classes.some(c => typeof c !== 'string' || (c !== 'unknown' && !advisories[c]))
    || new Set(m.classes).size !== m.classes.length
    || m.inputSize !== 224 || m.inputLayout !== 'NCHW' || m.outputType !== 'logits'
    || m.inputName !== 'image' || m.outputName !== 'logits'
    || !Array.isArray(m.mean) || !Array.isArray(m.std) || m.mean.length !== 3 || m.std.length !== 3
    || m.mean.some(v => !Number.isFinite(v)) || m.std.some(v => !Number.isFinite(v) || v <= 0)
    || !(m.confidenceThreshold >= .5 && m.confidenceThreshold <= 1)
    || !(m.marginThreshold >= 0 && m.marginThreshold <= 1)
    || !Array.isArray(m.trainingSources) || !Array.isArray(m.limitations)) {
    throw new Error('Incompatible crop pack. Use metadata.json exported by the Berqo training script.');
  }
  return m;
}
