import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FieldObservation } from '../domain';
import { getAdvisory } from '../data/advisories';
import { evaluateRisk } from '../risk';
import { useScout } from './Provider';
type Screen = 'home' | 'inspect' | 'result' | 'history' | 'settings' | 'passport';
const colors = { ink: '#193B2B', paper: '#F7F5EF', muted: '#69776D', green: '#285B3E', line: '#E1E6DC', orange: '#F3AB57', pale: '#EDF2E7' };
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (pressed || disabled) && { opacity: .55 }]}><Text style={[s.buttonText, secondary && { color: colors.ink }]}>{title}</Text></Pressable>;
}
function Card({ children, tinted = false }: React.PropsWithChildren<{ tinted?: boolean }>) { return <View style={[s.card, tinted && { backgroundColor: colors.pale }]}>{children}</View>; }
function Label({ children }: React.PropsWithChildren) { return <Text style={s.label}>{children}</Text>; }
function Source({ url, label }: { url: string; label: string }) { return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(url); }}><Text style={s.link}>{label} ↗</Text></Pressable>; }
function LocationDetails() {
  const c = useScout();
  return <><Text style={s.rowTitle}>{c.t(c.location.source === 'gps' ? 'gpsLocation' : c.location.source === 'default' ? 'defaultLocation' : 'manualLocation')}</Text>
    <Text style={s.body}>{c.location.latitude.toFixed(5)}°, {c.location.longitude.toFixed(5)}°</Text>
    {c.location.accuracy !== undefined && <Text style={s.small}>{c.t('gpsAccuracy')}: ±{Math.round(c.location.accuracy)} m</Text>}
    {c.location.recordedAt && <Text style={s.small}>{c.t('date')}: {new Date(c.location.recordedAt).toLocaleString(c.language === 'hy' ? 'hy-AM' : 'en-GB')}</Text>}</>;
}
function WeatherPanel() {
  const c = useScout(), t = c.t, weather = c.weather;
  const hours = weather?.hours.filter(h => Date.parse(h.time) >= c.now && Date.parse(h.time) <= c.now + 48 * 3600_000) ?? [];
  const stale = weather && (!Number.isFinite(Date.parse(weather.fetchedAt)) || c.now - Date.parse(weather.fetchedAt) > 24 * 3600_000 || !hours.length);
  const locale = c.language === 'hy' ? 'hy-AM' : 'en-GB';
  return <>
    <Text style={s.section}>{t('weather')}</Text><Card><LocationDetails /><Text style={s.small}>{t('gpsHelp')}</Text>
      <Button title={t('useGps')} disabled={c.busy} onPress={() => { void c.useGps(); }} /></Card>
    {!weather ? <Text style={s.body}>{t('noWeather')}</Text> : <>
      {weather.source === 'demo' && <Text style={s.demo}>{t('demo')}</Text>}
      <Text style={s.small}>{t('cached')}: {new Date(weather.fetchedAt).toLocaleString(locale)}{weather.timezone ? ` · ${weather.timezone}` : ''}</Text>
      {stale ? <Card><Text style={s.body}>{t('stale')}</Text></Card> : <>
        <Card><Label>{t('forecast')}</Label><Text style={s.weatherNumber}>{Math.round(Math.min(...hours.map(h => h.temperature)))}° — {Math.round(Math.max(...hours.map(h => h.temperature)))}°C</Text>
          <Text style={s.body}>{t('rain')}: {hours.reduce((sum, h) => sum + h.rain, 0).toFixed(1)} mm</Text>
          <Label>{t('nextHours')}</Label>
          {hours.slice(0, 6).map(h => <View key={h.time} style={s.between}><Text style={s.small}>{new Date(h.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: weather.timezone ?? 'UTC' })}</Text><Text style={s.body}>{Math.round(h.temperature)}°C · {h.rain.toFixed(1)} mm</Text><Text style={s.small}>{t('humidity')} {Math.round(h.humidity)}%</Text></View>)}
        </Card>
        {!!weather.days?.length && <Card><Label>{t('threeDays')}</Label>{weather.days.map(day => <View key={day.date} style={s.between}>
          <Text style={s.rowTitle}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text>
          <Text style={s.body}>{Math.round(day.minimum)}° / {Math.round(day.maximum)}°C</Text><Text style={s.small}>{day.rain.toFixed(1)} mm</Text>
        </View>)}</Card>}
        <Label>{t('suggestions')}</Label>
        {!evaluateRisk(weather, c.now).length && <Text style={s.body}>{t('calm')}</Text>}
        {evaluateRisk(weather, c.now).map(risk => <Card key={risk.id} tinted><Label>{risk.severity === 'attention' ? '!' : '↗'} {risk.title[c.language]}</Label><Text style={s.body}>{risk.summary[c.language]}</Text><Source url={risk.sourceUrl} label={t('source')} /><Button secondary title={t('start')} onPress={c.start} disabled={c.busy} /></Card>)}
      </>}
      {weather.source === 'open-meteo' && <Source url="https://open-meteo.com/" label="Open-Meteo · CC BY 4.0" />}
    </>}
    <Button title={t('refresh')} secondary disabled={c.busy} onPress={() => { void c.refreshWeather(); }} />
  </>;
}
function LocationSettings() {
  const c = useScout(), t = c.t;
  const [latitude, setLatitude] = useState(String(c.location.latitude));
  const [longitude, setLongitude] = useState(String(c.location.longitude));
  return <Card><Label>{t('location')}</Label><LocationDetails /><Button title={t('useGps')} disabled={c.busy} onPress={() => { void c.useGps(); }} /><Text style={s.small}>{t('gpsHelp')}</Text><Text style={s.small}>{t('coordsHelp')}</Text><Text style={s.small}>{t('lat')}</Text><TextInput style={s.input} keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} /><Text style={s.small}>{t('lon')}</Text><TextInput style={s.input} keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} /><Button title={t('apply')} disabled={c.busy} onPress={() => { void c.preferences(c.language, { latitude: Number(latitude.replace(',', '.')), longitude: Number(longitude.replace(',', '.')), source: 'manual', recordedAt: new Date().toISOString() }); }} /></Card>;
}
export function FieldScoutScreen({ screen }: { screen: Screen }) {
  const c = useScout();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const t = c.t;
  const date = (value: string) => new Date(value).toLocaleString(c.language === 'hy' ? 'hy-AM' : 'en-GB');
  function observationRow(item: FieldObservation) {
    const advisory = getAdvisory(item.advisoryId);
    return <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(`/passport/${item.id}`)} style={s.row}>
      <Image source={{ uri: item.imageUri }} style={s.thumb} /><View style={s.rowBody}><Text style={s.rowTitle}>{advisory.title[c.language]}</Text><Text style={s.small}>{date(item.createdAt)}</Text><Text style={s.status}>{t(item.syncStatus)}</Text></View><Text style={s.arrow}>↗</Text>
    </Pressable>;
  }
  function finding(item: FieldObservation, saved: boolean) {
    const advisory = getAdvisory(item.advisoryId);
    return <>
      <Image source={{ uri: item.imageUri }} accessibilityLabel={t('photo')} style={s.photo} />
      <View style={s.tagRow}><Text style={s.tag}>{t('apricot')}</Text><Text style={s.tag}>{item.decision === 'possible' ? t('possible') : item.decision === 'uncertain' ? t('uncertain') : t('unavailable')}</Text></View>
      <Text style={s.heading}>{advisory.title[c.language]}</Text>
      {item.prediction ? <Card>
        <View style={s.between}><Label>{t('confidence')}</Label><Text style={s.score}>{Math.round(item.prediction.confidence * 100)}%</Text></View>
        <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(item.prediction.confidence * 100)}%`, backgroundColor: item.decision === 'possible' ? colors.green : colors.orange }]} /></View>
        <Text style={s.small}>{t('warning')}</Text>
      </Card> : <Text style={s.body}>{t('noPrediction')}</Text>}
      <Card tinted><Label>{t('next')}</Label><Text style={s.body}>{advisory.summary[c.language]}</Text>{advisory.sourceUrl && <Source url={advisory.sourceUrl} label="UC IPM" />}</Card>
      {saved ? <>
        <Card><Label>{t('saved')}</Label><Text style={s.body}>{t('date')}: {date(item.createdAt)}</Text><Text style={s.body}>{t('crop')}: {t('apricot')}</Text>
          {item.location && <Text style={s.body}>{t('location')}: {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}</Text>}
          {!!item.farmerNote && <Text style={s.body}>{item.farmerNote}</Text>}
          <Text style={s.status}>{t(item.syncStatus)} · {t(item.reviewStatus)}</Text>
          {!!item.syncError && <Text style={s.small}>{item.syncError}</Text>}
          {item.prediction && <Text style={s.small}>{item.prediction.modelId} · v{item.prediction.modelVersion} · {item.prediction.elapsedMs} ms</Text>}
        </Card>
        {item.reviewStatus === 'not_requested' && <Button title={t('review')} disabled={c.busy} onPress={() => { void c.queue(item, true); }} />}
        <Card><Label>{t('demo')}</Label><Text style={s.small}>{t('syncDemo')}</Text><Button secondary title={t('queue')} disabled={c.busy} onPress={() => { void c.queue(item); }} /></Card>
        <Text style={s.small}>{t('sharePrivacy')}</Text>
        <Button title={t('export')} secondary disabled={c.busy} onPress={() => { void c.share(item, false); }} /><Button title={t('sharePhoto')} secondary disabled={c.busy} onPress={() => { void c.share(item, true); }} />
      </> : <>
        <Label>{t('note')}</Label><TextInput style={[s.input, s.note]} multiline placeholder={t('noteHint')} placeholderTextColor={colors.muted} value={c.note} onChangeText={c.setNote} maxLength={1000} />
        <Button title={t('save')} disabled={c.busy} onPress={() => { void c.save(false); }} />
        <Button title={t('review')} secondary disabled={c.busy} onPress={() => { void c.save(true); }} />
        <Text style={s.small}>{t('syncDemo')}</Text>
        <Button title={t('another')} secondary disabled={c.busy} onPress={c.start} />
      </>}
    </>;
  }
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <View style={s.header}><Pressable accessibilityRole="button" onPress={() => router.navigate('/')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Image source={require('../../../assets/berqo-logo.png')} style={{ width: 42, height: 42 }} accessibilityLabel="Berqo logo" /><Text style={s.brand}>Berqo</Text></View></Pressable><Pressable accessibilityRole="button" onPress={() => { void c.preferences(c.language === 'en' ? 'hy' : 'en', c.location); }} disabled={c.busy}><Text style={s.language}>{c.language === 'en' ? 'Հայերեն' : 'English'}</Text></Pressable></View>
    <View style={s.connection}><View style={[s.dot, { backgroundColor: c.online ? '#658752' : colors.orange }]} /><Text style={s.small}>{t(c.online ? 'online' : 'offline')}</Text></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {screen !== 'home' && <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.navigate('/')}><Text style={s.link}>← {t('back')}</Text></Pressable>}
      {screen === 'home' && <>
        <Label>{t('subtitle')}</Label><Text style={s.hero}>{t('title')}</Text><Text style={s.body}>{t('intro')}</Text>
        <View style={s.orchardArt}><View style={s.sun} /><Text style={s.artTree}>♧</Text><Text style={s.artText}>PRUNUS ARMENIACA</Text><View style={s.fruit1} /><View style={s.fruit2} /><View style={s.fruit3} /></View>
        <Button title={`${t('start')}  →`} onPress={c.start} disabled={c.busy} />
        {!c.metadata && <Card tinted><Text style={s.rowTitle}>{t('modelMissing')}</Text><Text style={s.small}>{t('missingHelp')}</Text><Button secondary title={t('settings')} onPress={() => router.push('/settings')} /></Card>}
        {c.modelError.includes('NATIVE_BUILD_REQUIRED') && <Text style={s.small}>{t('nativeRequired')}</Text>}
        <WeatherPanel />
        <Text style={s.section}>{t('recent')}</Text>{c.observations.length ? c.observations.slice(0, 3).map(observationRow) : <Text style={s.body}>{t('empty')}</Text>}
      </>}
      {screen === 'inspect' && <>
        <Label>{t('subtitle')}</Label><Text style={s.heading}>{t('photo')}</Text><Text style={s.body}>{t('guide')}</Text>
        {c.photo ? <Image source={{ uri: c.photo }} style={s.photo} /> : <View style={s.placeholder}><Text style={s.placeholderGlyph}>＋</Text><Text style={s.small}>{t('photo')}</Text></View>}
        <Button title={t('upload')} onPress={() => { void c.choosePhoto(false); }} disabled={c.busy} />
        <Button title={t('camera')} secondary onPress={() => { void c.choosePhoto(true); }} disabled={c.busy} />
        {c.photo && <Button title={c.metadata ? t('analyze') : t('save')} disabled={c.busy} onPress={() => { void c.analyze(); }} />}
        {!c.metadata && <Text style={s.small}>{t('missingHelp')}</Text>}
      </>}
      {screen === 'result' && (c.draft ? <><Label>{t('result')}</Label>{finding(c.draft, false)}</> : <Button title={t('start')} onPress={c.start} />)}
      {screen === 'passport' && (() => { const item = c.observations.find(o => o.id === params.id); return item ? <><Label>{t('saved')}</Label>{finding(item, true)}</> : <Text style={s.body}>{t('missingPassport')}</Text>; })()}
      {screen === 'history' && <>
        <Label>{t('subtitle')}</Label><Text style={s.heading}>{t('history')}</Text>
        {c.observations.length ? c.observations.map(observationRow) : <Text style={s.body}>{t('empty')}</Text>}
        <Button title={t('sync')} disabled={c.busy} onPress={() => { void c.sync(); }} /><Card tinted><Label>{t('demo')}</Label><Text style={s.small}>{t('syncDemo')}</Text></Card>
      </>}
      {screen === 'settings' && <>
        <Text style={s.heading}>{t('settings')}</Text>
        <Card><Label>{t('model')}</Label><Text style={s.rowTitle}>{t(c.metadata ? 'modelReady' : 'modelMissing')}</Text>
          {c.modelError.includes('NATIVE_BUILD_REQUIRED') && <Text style={s.small}>{t('nativeRequired')}</Text>}
          {c.metadata && <><Text style={s.small}>{c.metadata.modelId} · v{c.metadata.version}</Text><Text style={s.small}>{c.metadata.classes.join(', ')}</Text><Text style={s.small}>{t('thresholds')}</Text></>}
          <Text style={s.body}>{t('modelHelp')}</Text><Button title={t('importModel')} disabled={c.busy} onPress={() => { void c.installModel(); }} />
          <Text style={s.small}>{t('modelLimit')}</Text>
          {c.metadata?.trainingSources.map(source => <Source key={source.url} url={source.url} label={`${source.title} (${source.license})`} />)}
        </Card>
        <LocationSettings key={`${c.location.latitude},${c.location.longitude}`} />
        <Card tinted><Label>{t('demo')}</Label><Button secondary title={t('demoWeather')} onPress={() => { c.sampleWeather(); router.navigate('/'); }} /><Button secondary title={t('failDemo')} onPress={c.failNext} /><Text style={s.small}>{t('syncDemo')}</Text></Card>
        <Label>{t('about')}</Label><Text style={s.body}>{t('privacy')}</Text><Source url="https://open-meteo.com/en/terms" label="Open-Meteo · non-commercial hackathon API" />
      </>}
      <Text style={s.footer}>BERQO · APRICOT FIELD SCOUT</Text>
    </ScrollView>
    <View style={s.nav}>{(['home', 'inspect', 'history', 'settings'] as const).map((tab, i) => <Pressable key={tab} accessibilityRole="button" disabled={c.busy} onPress={() => tab === 'inspect' ? c.start() : router.navigate(tab === 'home' ? '/' : `/${tab}`)} style={s.navItem}><Text style={[s.navGlyph, screen === tab && { color: colors.green }]}>{['♧', '◎', '▤', '☷'][i]}</Text><Text style={[s.navText, screen === tab && { color: colors.green, fontWeight: '700' }]}>{t(tab === 'home' ? 'orchard' : tab)}</Text></Pressable>)}</View>
    {c.busy && <View style={s.overlay}><ActivityIndicator size="large" color={colors.green} /><Text style={s.section}>{c.locating ? t('locating') : screen === 'inspect' ? t('processing') : t('busy')}</Text><Text style={s.body}>{screen === 'inspect' ? t('processingDetail') : ''}</Text></View>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 },
  brand: { color: colors.ink, fontWeight: '800', fontSize: 30, letterSpacing: -1.8 }, language: { color: colors.green, fontSize: 13, fontWeight: '600', padding: 10 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 24, paddingBottom: 10 }, dot: { width: 6, height: 6, borderRadius: 3 },
  content: { padding: 24, paddingTop: 14, gap: 16 }, label: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  hero: { fontSize: 43, lineHeight: 49, fontWeight: '700', letterSpacing: -1.6, color: colors.ink }, heading: { fontSize: 29, lineHeight: 36, fontWeight: '700', color: colors.ink, letterSpacing: -.5 },
  section: { fontSize: 21, fontWeight: '700', color: colors.ink, marginTop: 6 }, body: { fontSize: 16, lineHeight: 25, color: colors.ink }, small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  button: { minHeight: 54, backgroundColor: colors.green, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' }, secondary: { backgroundColor: '#E9EEE3' },
  card: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 20, gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, link: { color: colors.green, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  orchardArt: { height: 165, backgroundColor: '#E5EBD9', borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, sun: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#F6D28A', right: -15, top: -20 },
  artTree: { fontSize: 160, color: '#57744B', lineHeight: 165, top: -6 }, artText: { position: 'absolute', bottom: 15, left: 18, color: '#647554', fontSize: 10, letterSpacing: 2 },
  fruit1: { position: 'absolute', backgroundColor: colors.orange, width: 23, height: 23, borderRadius: 12, left: '47%', top: 57 }, fruit2: { position: 'absolute', backgroundColor: '#EBA15A', width: 20, height: 20, borderRadius: 10, left: '57%', top: 86 }, fruit3: { position: 'absolute', backgroundColor: '#F1BC67', width: 18, height: 18, borderRadius: 9, left: '36%', top: 85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 14 }, rowBody: { flex: 1, gap: 4 }, thumb: { width: 64, height: 70, borderRadius: 12, backgroundColor: colors.pale }, rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 23 }, arrow: { color: colors.green, fontSize: 22 }, status: { fontSize: 12, color: colors.green, lineHeight: 19 },
  photo: { width: '100%', height: 285, borderRadius: 24, backgroundColor: colors.pale, resizeMode: 'contain' }, tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, tag: { fontSize: 11, color: colors.green, backgroundColor: colors.pale, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 },
  score: { fontSize: 27, fontWeight: '700', color: colors.ink }, bar: { height: 6, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' }, barFill: { height: 6 },
  input: { borderWidth: 1, borderColor: '#CDD7C8', borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink, backgroundColor: '#FFFDF8' }, note: { minHeight: 95, textAlignVertical: 'top' },
  placeholder: { height: 235, backgroundColor: colors.pale, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B7C6AE', alignItems: 'center', justifyContent: 'center', gap: 16 }, placeholderGlyph: { fontSize: 48, color: '#8D9E81' },
  weatherNumber: { fontSize: 33, color: colors.ink, fontWeight: '600' }, demo: { fontSize: 12, color: '#965B13', fontWeight: '700' },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, paddingBottom: 8, backgroundColor: '#FFFDF8' }, navItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }, navGlyph: { fontSize: 24, color: '#9CA596' }, navText: { fontSize: 10, color: colors.muted },
  footer: { color: '#96A18E', fontSize: 10, letterSpacing: 2, marginTop: 15, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: '#F7F5EFF5', justifyContent: 'center', alignItems: 'center', gap: 20, padding: 30 },
});
