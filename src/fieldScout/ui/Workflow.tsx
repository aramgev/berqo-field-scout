import React, { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FieldObservation, OrchardInspection, Weather } from '../domain';
import { MAX_TREES, snapshotWeather, summarizeInspection } from '../inspection';
import { carePlan } from '../care';
import { reportText } from '../report';
import { getObservationAdvisory } from '../data/advisories';
import { evaluateRisk } from '../risk';
import { useScout } from './Provider';

export const colors = { ink: '#183E32', paper: '#F5F4EE', muted: '#5E7269', green: '#246B50', line: '#DDE5DC', orange: '#EFAD64', pale: '#EAF1E8' };
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (pressed || disabled) && { opacity: .5 }]}><Text style={[s.buttonText, secondary && { color: colors.ink }]}>{title}</Text></Pressable>;
}
export function Card({ children, tinted = false }: React.PropsWithChildren<{ tinted?: boolean }>) { return <View style={[s.card, tinted && { backgroundColor: colors.pale }]}>{children}</View>; }
export function Label({ children }: React.PropsWithChildren) { return <Text style={s.label}>{children}</Text>; }
export function Disclosure({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(false);
  return <View style={s.disclosure}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={() => setOpen(!open)} style={s.disclosureHeader}><Text style={[s.rowTitle, { flex: 1 }]}>{title}</Text><Text style={s.arrow}>{open ? '−' : '+'}</Text></Pressable>{open && <View style={s.disclosureBody}>{children}</View>}</View>;
}
export function Source({ url, label }: { url: string; label: string }) { return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(url); }} style={s.textAction}><Text style={s.link}>{label} ↗</Text></Pressable>; }
export function InfoLink() { const c = useScout(), router = useRouter(); return <Pressable accessibilityRole="button" onPress={() => router.push('/about')} style={s.textAction}><Text style={s.link}>{c.t('infoLink')}</Text></Pressable>; }
export function LocationDetails() {
  const c = useScout();
  return <><Text style={s.rowTitle}>{c.t(c.location.source === 'gps' ? 'gpsLocation' : c.location.source === 'default' ? 'defaultLocation' : 'manualLocation')}</Text><Text style={s.body}>{c.location.latitude.toFixed(5)}°, {c.location.longitude.toFixed(5)}°</Text>{c.location.accuracy !== undefined && <Text style={s.small}>{c.t('gpsAccuracy')}: ±{Math.round(c.location.accuracy)} m</Text>}</>;
}
export function CareSteps({ item }: { item: FieldObservation }) {
  const c = useScout(), plan = carePlan(item);
  return <Card tinted><Label>{c.t('followUp')}</Label>{plan.steps.map((step, i) => <View key={i} style={s.stepRow}><Text style={s.stepNumber}>{i + 1}</Text><View style={s.rowBody}><Text style={s.rowTitle}>{step.title[c.language]}</Text><Text style={s.body}>{step.detail[c.language]}</Text></View></View>)}{plan.sourceUrl && <Source url={plan.sourceUrl} label={c.t('readSource')} />}</Card>;
}
export function WeatherContext({ weather, at, walk = false }: { weather?: Weather; at: string; walk?: boolean }) {
  const c = useScout(), t = c.t;
  const risks = weather ? evaluateRisk(weather, Date.parse(at)) : [];
  const hours = weather?.hours.filter(h => Date.parse(h.time) >= Date.parse(at) && Date.parse(h.time) <= Date.parse(at) + 48 * 3600_000) ?? [];
  return <Card><Label>{t('weatherContext')}</Label>{!weather || !hours.length ? <Text style={s.small}>{t('weatherMissing')}</Text> : <>
    {weather.source === 'demo' && <Text style={s.demo}>{t('demo')}</Text>}{weather.location.source === 'default' && <Text style={s.small}>{t('defaultContext')}</Text>}
    <Text style={s.rowTitle}>{Math.round(Math.min(...hours.map(h => h.temperature)))}°–{Math.round(Math.max(...hours.map(h => h.temperature)))}°C · {hours.reduce((sum, h) => sum + h.rain, 0).toFixed(1)} mm</Text>
    {risks.map(risk => <View key={risk.id} style={s.rowBody}><Text style={s.rowTitle}>{risk.title[c.language]}</Text><Text style={s.body}>{risk.action[c.language]}</Text></View>)}{!risks.length && <Text style={s.small}>{t('calm')}</Text>}
    <Text style={s.small}>{t('forecast')} · {new Date(at).toLocaleDateString(c.language === 'hy' ? 'hy-AM' : 'en-GB')}</Text>
    <Disclosure title={t(walk ? 'walkWeather' : 'weatherSaved')}><Text style={s.small}>{new Date(weather.fetchedAt).toLocaleString(c.language === 'hy' ? 'hy-AM' : 'en-GB')}</Text><Text style={s.small}>{t('weatherContextHelp')}</Text><Text style={s.small}>{t('weatherSnapshotHelp')}</Text>{risks.map(risk => <View key={risk.id}><Text style={s.small}>{risk.summary[c.language]}</Text><Source url={risk.sourceUrl} label={t('source')} /></View>)}{weather.source === 'open-meteo' && <Source url="https://open-meteo.com/" label="Open-Meteo · CC BY 4.0" />}</Disclosure>
  </>}</Card>;
}
export function WeatherPanel() {
  const c = useScout(), t = c.t, router = useRouter();
  const weather = snapshotWeather(c.weather, c.location, c.now);
  const hours = weather?.hours.filter(h => Date.parse(h.time) >= c.now && Date.parse(h.time) <= c.now + 48 * 3600_000) ?? [];
  const risks = weather ? evaluateRisk(weather, c.now) : [];
  return <Card><View style={s.between}><Label>{t('weather')}</Label><Text style={s.small}>{t('forecast')}</Text></View>
    {weather && hours.length ? <>{weather.source === 'demo' && <Text style={s.demo}>{t('demo')}</Text>}{weather.location.source === 'default' && <Text style={s.small}>{t('defaultContext')}</Text>}<Text style={s.weatherNumber}>{Math.round(Math.min(...hours.map(h => h.temperature)))}°–{Math.round(Math.max(...hours.map(h => h.temperature)))}°C</Text><Text style={s.body}>{t('rain')} · {hours.reduce((sum, h) => sum + h.rain, 0).toFixed(1)} mm</Text>{risks.slice(0, 1).map(r => <Text key={r.id} style={s.rowTitle}>{r.title[c.language]}</Text>)}<Text style={s.small}>{t('weatherAuto')}</Text></> : <Text style={s.body}>{t(c.weather ? 'stale' : 'noWeather')}</Text>}
    <Disclosure title={t('forecastDetails')}><LocationDetails /><Text style={s.small}>{t('gpsHelp')}</Text><Button title={t('useGps')} secondary disabled={c.busy} onPress={() => { void c.useGps(); }} /><Pressable accessibilityRole="button" style={s.textAction} onPress={() => router.push('/settings')}><Text style={s.link}>{t('apply')} →</Text></Pressable>
      {c.weather && <Text style={s.small}>{t('cached')}: {new Date(c.weather.fetchedAt).toLocaleString(c.language === 'hy' ? 'hy-AM' : 'en-GB')}</Text>}
      {weather?.days?.map(day => <View key={day.date} style={s.between}><Text style={s.rowTitle}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString(c.language === 'hy' ? 'hy-AM' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text><Text style={s.body}>{Math.round(day.minimum)}° / {Math.round(day.maximum)}°C · {day.rain.toFixed(1)} mm</Text></View>)}
      {risks.map(r => <View key={r.id} style={s.rowBody}><Text style={s.rowTitle}>{r.title[c.language]}</Text><Text style={s.body}>{r.summary[c.language]}</Text><Source url={r.sourceUrl} label={t('source')} /></View>)}{weather?.source === 'open-meteo' && <Source url="https://open-meteo.com/" label="Open-Meteo · CC BY 4.0" />}
    </Disclosure><Button title={t('refresh')} secondary disabled={c.busy || !c.online} onPress={() => { void c.refreshWeather(); }} />
  </Card>;
}
export function Capture({ inspectionId }: { inspectionId?: string }) {
  const c = useScout(), t = c.t;
  const photo = inspectionId ? (c.collectionPhoto?.inspectionId === inspectionId ? c.collectionPhoto.uri : null) : c.photo;
  const [replacing, setReplacing] = useState(false);
  return <>{photo ? <Image source={{ uri: photo }} style={s.photo} accessibilityLabel={t('photo')} /> : <View style={s.placeholder}><View style={s.cameraFrame}><Text style={s.placeholderGlyph}>◎</Text></View><Text style={s.rowTitle}>{t('photo')}</Text><Text style={[s.small, { textAlign: 'center' }]}>{t('guide')}</Text></View>}
    {!photo || replacing ? <><Button title={c.t('camera')} disabled={c.busy} onPress={() => { setReplacing(false); void c.choosePhoto(true, inspectionId); }} /><Button secondary title={c.t('upload')} disabled={c.busy} onPress={() => { setReplacing(false); void c.choosePhoto(false, inspectionId); }} /><Text style={s.small}>{t('photoSources')}</Text></> : <Pressable accessibilityRole="button" onPress={() => setReplacing(true)} style={s.textAction}><Text style={s.link}>{t('changePhoto')}</Text></Pressable>}
    {photo && <Button title={t(c.metadata ? 'checkPhoto' : 'recordPhoto')} disabled={c.busy} onPress={() => { void (inspectionId ? c.addCollectionTree(inspectionId) : c.analyze()); }} />}{!c.metadata && <Text style={s.small}>{t('missingHelp')}</Text>}
  </>;
}
export function ReportActions({ items, inspection }: { items: FieldObservation[]; inspection?: OrchardInspection }) {
  const c = useScout(), [includeLocation, setIncludeLocation] = useState(false);
  return <Card><Label>{c.t('shareEvidence')}</Label><Text style={s.small}>{c.t('shareEvidenceHelp')}</Text><View style={s.between}><Text style={[s.body, { flex: 1 }]}>{c.t('includeCoordinates')}</Text><Switch accessibilityLabel={c.t('includeCoordinates')} value={includeLocation} onValueChange={setIncludeLocation} disabled={c.busy} /></View><Button title={c.t('shareReport')} disabled={c.busy || !items.length} onPress={() => { void c.shareReport(items, includeLocation, inspection); }} />
    <Disclosure title={c.t('sharingOptions')}><Text style={s.small}>{c.t('reportHelp')}</Text><Text selectable style={s.small}>{reportText(items, c.language, includeLocation, inspection)}</Text><Button secondary title={c.t('shareTextReport')} disabled={c.busy || !items.length} onPress={() => { void c.shareReport(items, includeLocation, inspection, true); }} /></Disclosure></Card>;
}
export function Summary({ items }: { items: FieldObservation[] }) {
  const c = useScout(), summary = summarizeInspection(items);
  return <Card tinted><View style={s.stats}>{([{ value: summary.suspicious, key: 'attentionCount', color: '#9B531B' }, { value: summary.noSymptoms, key: 'clearCount', color: colors.green }, { value: summary.inconclusive, key: 'unclearCount', color: colors.muted }] as const).map(stat => <View key={stat.key} style={s.stat}><Text style={[s.statNumber, { color: stat.color }]}>{stat.value}</Text><Text style={s.statLabel}>{c.t(stat.key)}</Text></View>)}</View><Text style={s.small}>{c.t('sampleScope')}</Text></Card>;
}
function TreeFinding({ item, index, onRemove }: { item: FieldObservation; index: number; onRemove?: () => void }) {
  const c = useScout();
  return <Disclosure title={`${c.t('tree')} ${index + 1} · ${getObservationAdvisory(item).title[c.language]}`}><Image source={{ uri: item.imageUri }} style={s.photo} accessibilityLabel={`${c.t('tree')} ${index + 1}`} /><CareSteps item={item} /><Text style={s.small}>{c.t('warning')}</Text>{item.prediction && <Text style={s.small}>{c.t('confidence')}: {Math.round(item.prediction.confidence * 100)}% · v{item.prediction.modelVersion}</Text>}{onRemove && <Button secondary title={c.t('removeTree')} disabled={c.busy} onPress={onRemove} />}</Disclosure>;
}
export function CollectionPanel({ inspection }: { inspection: OrchardInspection }) {
  const c = useScout(), t = c.t, [note, setNote] = useState(inspection.note);
  const summary = summarizeInspection(inspection.observations), complete = inspection.status === 'complete', count = inspection.observations.length;
  return <><Label>{t(complete ? 'savedOnPhone' : 'walkOrchard')}</Label><Text style={s.heading}>{complete || count === MAX_TREES ? t('walkSummary') : `${t('tree')} ${count + 1} / ${MAX_TREES}`}</Text>
    {!complete && <><View style={s.progress}>{Array.from({ length: MAX_TREES }, (_, i) => <View key={i} style={[s.progressSegment, i < count && { backgroundColor: colors.green }]} />)}</View><Text style={s.small}>{t('walkProgress')}</Text>{count < MAX_TREES && <Capture key={count} inspectionId={inspection.id} />}{!!count && <><View style={s.savedBanner}><Text style={s.status}>✓ {t('sampled')}: {count} · {t('savedOnPhone')}</Text></View><TreeFinding item={inspection.observations[count - 1]} index={count - 1} onRemove={() => { void c.editCollection(inspection.id, { removeLast: true }); }} /><Button secondary={count < MAX_TREES} title={t('finishWalk')} disabled={c.busy} onPress={() => { void c.editCollection(inspection.id, { note, finish: true }); }} /></>}</>}
    {!!count && <Summary items={inspection.observations} />}{complete && <><Card tinted><Label>{t('walkNext')}</Label><Text style={s.body}>{t(summary.suspicious ? 'walkSuspicious' : summary.inconclusive ? 'walkUnclear' : 'walkClear')}</Text></Card><Label>{t('treeDetails')}</Label>{inspection.observations.map((item, index) => <TreeFinding key={item.id} item={item} index={index} />)}</>}
    <Disclosure title={t('optionalNote')}>{complete ? <Text style={s.body}>{inspection.note || '—'}</Text> : <><TextInput accessibilityLabel={t('note')} style={[s.input, s.note]} multiline maxLength={1000} value={note} onChangeText={setNote} placeholder={t('noteHint')} placeholderTextColor={colors.muted} /><Button secondary title={t('saveNote')} disabled={c.busy} onPress={() => { void c.editCollection(inspection.id, { note }); }} /><Text style={s.small}>{t('noteSaved')}</Text></>}</Disclosure>
    {complete && <><WeatherContext weather={inspection.weather} at={inspection.createdAt} walk /><ReportActions items={inspection.observations} inspection={inspection} /></>}<InfoLink />
  </>;
}
export function CheckChoices() {
  const c = useScout();
  return <View style={{ gap: 10 }}><Pressable accessibilityRole="button" accessibilityLabel={`${c.t('checkTree')}. ${c.t('checkTreeHelp')}`} disabled={c.busy} onPress={c.start} style={({ pressed }) => [s.choice, s.primaryChoice, pressed && { opacity: .8 }]}><View style={s.choiceIcon}><Text style={s.choiceGlyph}>◎</Text></View><View style={s.rowBody}><Text style={s.choiceTitle}>{c.t('checkTree')}</Text><Text style={s.choiceHelp}>{c.t('checkTreeHelp')}</Text></View><Text style={s.choiceArrow}>→</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.t('walkOrchard')}. ${c.t('walkHelp')}`} disabled={c.busy} onPress={() => { void c.startCollection(); }} style={({ pressed }) => [s.choice, pressed && { opacity: .8 }]}><View style={[s.choiceIcon, { backgroundColor: colors.pale }]}><Text style={[s.choiceGlyph, { color: colors.green }]}>♧</Text></View><View style={s.rowBody}><Text style={[s.choiceTitle, { color: colors.ink }]}>{c.t('walkOrchard')}</Text><Text style={[s.choiceHelp, { color: colors.muted }]}>{c.t('walkHelp')}</Text></View><Text style={[s.choiceArrow, { color: colors.green }]}>→</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({
  label: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: .7 }, heading: { fontSize: 30, lineHeight: 37, fontWeight: '700', color: colors.ink }, body: { fontSize: 16, lineHeight: 25, color: colors.ink }, small: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, minHeight: 112, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line }, primaryChoice: { backgroundColor: colors.green, borderColor: colors.green }, choiceIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' }, choiceGlyph: { fontSize: 28, color: '#FFF' }, choiceTitle: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: '#FFF' }, choiceHelp: { fontSize: 13, lineHeight: 20, color: '#E0EEE3' }, choiceArrow: { fontSize: 23, color: '#FFF' },
  button: { minHeight: 54, backgroundColor: colors.green, borderRadius: 17, paddingHorizontal: 18, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16, lineHeight: 23, fontWeight: '700', textAlign: 'center' }, secondary: { backgroundColor: colors.pale },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 18, gap: 14 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, link: { color: colors.green, fontSize: 14, lineHeight: 22, fontWeight: '600' }, textAction: { minHeight: 44, justifyContent: 'center' },
  disclosure: { borderTopWidth: 1, borderColor: colors.line }, disclosureHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 10 }, disclosureBody: { paddingTop: 4, paddingBottom: 12, gap: 14 },
  rowBody: { flex: 1, gap: 5 }, rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 24 }, arrow: { color: colors.green, fontSize: 22 }, status: { fontSize: 13, color: colors.green, lineHeight: 20 }, photo: { width: '100%', height: 260, borderRadius: 22, backgroundColor: colors.pale, resizeMode: 'contain' },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D4E3CF', color: colors.green, textAlign: 'center', lineHeight: 28, fontWeight: '700', fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#CDD7C8', borderRadius: 14, padding: 14, fontSize: 16, color: colors.ink, backgroundColor: '#FFF' }, note: { minHeight: 95, textAlignVertical: 'top' }, placeholder: { minHeight: 230, padding: 24, backgroundColor: colors.pale, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 14 }, cameraFrame: { width: 64, height: 60, borderWidth: 2, borderRadius: 16, borderColor: '#93AA95', alignItems: 'center', justifyContent: 'center' }, placeholderGlyph: { fontSize: 36, color: colors.green },
  weatherNumber: { fontSize: 36, color: colors.ink, fontWeight: '700', letterSpacing: -1 }, demo: { fontSize: 12, color: '#8D5115', fontWeight: '700' }, stats: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, gap: 5 }, statNumber: { fontSize: 36, fontWeight: '700' }, statLabel: { fontSize: 12, lineHeight: 18, color: colors.ink }, progress: { flexDirection: 'row', gap: 7 }, progressSegment: { height: 6, borderRadius: 3, flex: 1, backgroundColor: colors.line }, savedBanner: { padding: 12, backgroundColor: colors.pale, borderRadius: 14 },
});
