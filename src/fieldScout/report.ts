import { FieldObservation, Language, OrchardInspection } from './domain';
import { getObservationAdvisory } from './data/advisories';
import { summarizeInspection } from './inspection';
import { translate } from './i18n';
import { carePlan } from './care';
import { evaluateRisk } from './risk';

export function reportText(items: FieldObservation[], language: Language, includeLocation: boolean, inspection?: OrchardInspection): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const summary = summarizeInspection(items);
  const lines = ['BERQO', t('reportTitle'), `${t('crop')}: ${t('apricot')}`, `${t('date')}: ${inspection?.createdAt ?? items[0]?.createdAt ?? ''}`];
  if (inspection) lines.push(`${t('inspectionState')}: ${t(inspection.status === 'complete' ? 'completeInspection' : 'inProgressInspection')}`);
  lines.push(`${t('sampled')}: ${items.length}`, `${t('suspiciousPhotos')}: ${summary.suspicious}`, `${t('noSymptomsPhotos')}: ${summary.noSymptoms}`, `${t('inconclusivePhotos')}: ${summary.inconclusive}`, t('samplingLimit'));
  const weather = inspection?.weather ?? (items.length === 1 ? items[0].weather : undefined);
  if (weather) {
    lines.push('', `${t('weather')}: ${weather.source === 'demo' ? t('demo') : 'Open-Meteo'}`, `${t('forecastSnapshot')}: ${weather.fetchedAt}`, t('weatherSnapshotHelp'));
    if (inspection?.weatherReason) lines.push(inspection.weatherReason[language]);
    for (const day of weather.days ?? []) lines.push(`${day.date}: ${day.minimum.toFixed(1)} / ${day.maximum.toFixed(1)} °C; ${day.rain.toFixed(1)} mm`);
    for (const risk of evaluateRisk(weather, Date.parse(inspection?.createdAt ?? items[0].createdAt))) lines.push(risk.title[language], risk.summary[language], risk.sourceUrl);
  }
  if (inspection?.note) lines.push('', `${t('note')}: ${inspection.note}`);
  items.forEach((item, i) => {
    lines.push('', `${t('tree')} ${i + 1}`, `${t('date')}: ${item.createdAt}`, getObservationAdvisory(item).title[language]);
    if (item.prediction) lines.push(`${t('confidence')}: ${(item.prediction.confidence * 100).toFixed(1)}%; ${item.prediction.modelId} v${item.prediction.modelVersion}`);
    if (item.farmerNote) lines.push(`${t('note')}: ${item.farmerNote}`);
    if (includeLocation && item.location) lines.push(`${t('location')}: ${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)} (${item.location.source ?? 'manual'})`);
    lines.push(getObservationAdvisory(item).summary[language]);
    const plan = carePlan(item);
    plan.steps.forEach((step, index) => lines.push(`${index + 1}. ${step.title[language]}: ${step.detail[language]}`));
    if (plan.sourceUrl) lines.push(plan.sourceUrl);
  });
  lines.push('', t('warning'), t('reportReviewHelp'));
  return lines.join('\n');
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
export function reportHtml(text: string, photos: { label: string; base64: string }[], language: Language): string {
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Berqo Field Report</title><style>body{font-family:Arial,sans-serif;color:#193b2b;background:#f7f5ef;max-width:850px;margin:24px auto;padding:20px}pre{white-space:pre-wrap;font-family:inherit;line-height:1.6}figure{display:inline-block;margin:12px;vertical-align:top}img{max-width:100%;width:240px;height:200px;object-fit:contain}figcaption{font-weight:bold}</style></head><body><h1>Berqo</h1><pre>${escapeHtml(text)}</pre>${photos.map(photo => {
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(photo.base64)) throw new Error('Invalid report photo');
    return `<figure><img alt="${escapeHtml(photo.label)}" src="data:image/jpeg;base64,${photo.base64}"><figcaption>${escapeHtml(photo.label)}</figcaption></figure>`;
  }).join('')}</body></html>`;
}
