import { FieldObservation, Location, OrchardInspection, Weather } from './domain';
import { sameLocation } from './forecast';

export const MAX_TREES = 5;
export function summarizeInspection(items: FieldObservation[]) {
  return items.reduce((summary, item) => {
    if (item.decision !== 'possible') summary.inconclusive++;
    else if (item.prediction?.conditionId === 'healthy') summary.noSymptoms++;
    else summary.suspicious++;
    return summary;
  }, { suspicious: 0, noSymptoms: 0, inconclusive: 0 });
}
export function snapshotWeather(weather: Weather | null, location: Location, now: number): Weather | undefined {
  if (!weather || !sameLocation(weather.location, location)) return;
  const age = now - Date.parse(weather.fetchedAt);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 3600_000 || !weather.hours.some(h => Date.parse(h.time) >= now)) return;
  return JSON.parse(JSON.stringify(weather)) as Weather;
}
export function appendTree(inspection: OrchardInspection, observation: FieldObservation): OrchardInspection {
  if (inspection.status !== 'in_progress' || inspection.observations.length >= MAX_TREES) throw new Error('Inspection is closed or full');
  if (inspection.observations.some(item => item.id === observation.id)) throw new Error('Duplicate observation');
  return { ...inspection, observations: [...inspection.observations, observation] };
}
