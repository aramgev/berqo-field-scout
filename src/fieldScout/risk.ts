import { OrchardRisk, Weather } from './domain';
import { riskRules } from './data/riskRules';
export function evaluateRisk(weather: Weather, now = Date.now()): OrchardRisk[] {
  if (!Number.isFinite(Date.parse(weather.fetchedAt)) || now - Date.parse(weather.fetchedAt) > 24 * 3600_000) return [];
  const hours = weather.hours.filter(h => Date.parse(h.time) >= now && Date.parse(h.time) <= now + 48 * 3600_000);
  const risks: OrchardRisk[] = [];
  if (hours.some(h => h.temperature < riskRules.frost.temperatureBelow)) risks.push({
    id: 'frost', severity: 'attention', demo: weather.source === 'demo', sourceUrl: riskRules.frost.sourceUrl,
    title: { en: 'Freezing temperatures forecast', hy: 'Կանխատեսվում է զրոյից ցածր ջերմաստիճան' },
    summary: { en: 'Forecast temperatures fall below 0°C. Check local conditions and orchard growth stage with an agronomist. This is an inspection reminder; damage thresholds vary.', hy: 'Կանխատեսվող ջերմաստիճանը 0°C-ից ցածր է։ Գյուղատնտեսի հետ ստուգեք տեղական պայմանները և ծառերի աճի փուլը։ Վնասի շեմերը տարբեր են։' },
  });
  if (hours.length >= 24 && hours.every(h => h.rain === 0)) risks.push({
    id: 'soil-moisture', severity: 'watch', demo: weather.source === 'demo',
    sourceUrl: 'https://ipm.ucanr.edu/home-and-landscape/cultural-tips-for-growing-apricot/',
    title: { en: 'Dry forecast • check soil moisture', hy: 'Առանց տեղումների • ստուգեք հողի խոնավությունը' },
    summary: { en: 'No rain is forecast in the available next 48 hours. Check soil moisture near the root zone before adjusting irrigation, especially for young trees. Avoid prolonged saturation and wetting the trunk. A dry forecast alone does not show how much water your trees need.', hy: 'Հասանելի հաջորդ 48 ժամում տեղումներ չեն կանխատեսվում։ Ոռոգումը փոխելուց առաջ ստուգեք արմատային գոտու հողի խոնավությունը, հատկապես երիտասարդ ծառերի համար։ Խուսափեք երկարատև գերխոնավացումից և բնի թրջումից։ Կանխատեսումը միայնակ չի որոշում ջրի պահանջը։' },
  });
  if (hours.some(h => h.rain > riskRules.moisture.rainAbove)) risks.push({
    id: 'moisture', severity: 'watch', demo: weather.source === 'demo', sourceUrl: riskRules.moisture.sourceUrl,
    title: { en: 'Rain • inspect leaves and fruit', hy: 'Անձրև • զննեք տերևներն ու պտուղները' },
    summary: { en: 'Wet conditions can favor shot hole. Inspect after rain. Forecast rainfall does not measure leaf wetness and does not predict disease.', hy: 'Խոնավ պայմանները կարող են նպաստել ծակոտկենությանը։ Անձրևից հետո զննեք ծառերը։ Տեղումների կանխատեսումը չի չափում տերևի խոնավությունը և չի կանխատեսում հիվանդություն։' },
  });
  return risks;
}
