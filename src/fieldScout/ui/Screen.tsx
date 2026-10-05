import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FieldObservation, OrchardInspection } from '../domain';
import { summarizeInspection } from '../inspection';
import { getObservationAdvisory } from '../data/advisories';
import { useScout } from './Provider';
import { Button, Card, Label, Source, LocationDetails, WeatherPanel, ReportActions, CollectionPanel, CheckChoices, Capture, CareSteps, WeatherContext, Disclosure, InfoLink, colors } from './Workflow';
type Screen = 'home' | 'inspect' | 'result' | 'history' | 'settings' | 'passport' | 'collections' | 'collection' | 'about';
function LocationSettings() {
  const c = useScout(), t = c.t;
  const [latitude, setLatitude] = useState(String(c.location.latitude));
  const [longitude, setLongitude] = useState(String(c.location.longitude));
  return <Card><Label>{t('location')}</Label><LocationDetails /><Text style={s.small}>{t('gpsHelp')}</Text><Button title={t('useGps')} disabled={c.busy} onPress={() => { void c.useGps(); }} /><Disclosure title={t('manualLocation')}><Text style={s.small}>{t('lat')}</Text><TextInput accessibilityLabel={t('lat')} style={s.input} keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} /><Text style={s.small}>{t('lon')}</Text><TextInput accessibilityLabel={t('lon')} style={s.input} keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} /><Button title={t('apply')} disabled={c.busy} onPress={() => { void c.preferences(c.language, { latitude: Number(latitude.replace(',', '.')), longitude: Number(longitude.replace(',', '.')), source: 'manual', recordedAt: new Date().toISOString() }); }} /></Disclosure></Card>;
}
export function FieldScoutScreen({ screen }: { screen: Screen }) {
  const c = useScout();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const t = c.t;
  const date = (value: string) => new Date(value).toLocaleString(c.language === 'hy' ? 'hy-AM' : 'en-GB');
  function observationRow(item: FieldObservation) {
    const advisory = getObservationAdvisory(item);
    return <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(`/passport/${item.id}`)} style={s.row}>
      <Image source={{ uri: item.imageUri }} style={s.thumb} /><View style={s.rowBody}><Text style={s.rowTitle}>{advisory.title[c.language]}</Text><Text style={s.small}>{date(item.createdAt)}</Text></View><Text style={s.arrow}>→</Text>
    </Pressable>;
  }
  function walkRow(item: OrchardInspection) {
    const summary = summarizeInspection(item.observations);
    return <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(`/scout/${item.id}`)} style={s.row}><View style={s.walkThumb}><Text style={s.arrow}>♧</Text></View><View style={s.rowBody}><Text style={s.rowTitle}>{t('walkOrchard')} · {item.observations.length}/5</Text><Text style={s.small}>{date(item.createdAt)}</Text><Text style={s.status}>{t(item.status === 'complete' ? 'completeInspection' : 'inProgressInspection')} · {summary.suspicious} {t('attentionCount').toLowerCase()}</Text></View><Text style={s.arrow}>→</Text></Pressable>;
  }
  function finding(item: FieldObservation, saved: boolean) {
    const healthy = item.decision === 'possible' && item.advisoryId === 'healthy';
    return <>
      <View style={[s.findingHero, !healthy && s.attentionHero]}><Text style={s.findingEyebrow}>{t(healthy ? 'healthyTag' : item.decision === 'possible' ? 'possible' : item.decision === 'uncertain' ? 'uncertain' : 'unavailable')}</Text><Text style={s.findingTitle}>{getObservationAdvisory(item).title[c.language]}</Text><Text style={s.findingEyebrow}>{t('apricot')} · {saved ? t('savedOnPhone') : t('result')}</Text></View>
      <CareSteps item={item} />
      {saved ? <ReportActions key={item.id} items={[item]} /> : <>
        <Disclosure title={t('optionalNote')}><TextInput accessibilityLabel={t('note')} style={[s.input, s.note]} multiline placeholder={t('noteHint')} placeholderTextColor={colors.muted} value={c.note} onChangeText={c.setNote} maxLength={1000} /></Disclosure>
        {item.decision === 'uncertain' && <Button title={t('another')} secondary disabled={c.busy} onPress={c.start} />}
        {item.decision === 'unavailable' && <Button title={t('settings')} secondary disabled={c.busy} onPress={() => router.push('/settings')} />}
      </>}
      <WeatherContext weather={item.weather} at={item.createdAt} />
      <Disclosure title={t('details')}><Image source={{ uri: item.imageUri }} accessibilityLabel={t('photo')} style={s.photo} />
        {item.prediction ? <><View style={s.between}><Label>{t('confidence')}</Label><Text style={s.score}>{Math.round(item.prediction.confidence * 100)}%</Text></View><Text style={s.small}>{t('modelInfo')}</Text><Text style={s.small}>{item.prediction.modelId} · v{item.prediction.modelVersion} · {item.prediction.elapsedMs} ms</Text></> : <Text style={s.small}>{t('noPrediction')}</Text>}
        <Text style={s.small}>{t('warning')}</Text><Text style={s.small}>{t('date')}: {date(item.createdAt)}</Text>
        {item.location && <Text style={s.small}>{t('location')}: {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}</Text>}
        {saved && <><Text style={s.body}>{item.farmerNote}</Text><Text style={s.small}>{t(item.syncStatus)}</Text><Text style={s.small}>{t('sharePrivacy')}</Text><Button title={t('export')} secondary disabled={c.busy} onPress={() => { void c.share(item, false); }} /><Button title={t('sharePhoto')} secondary disabled={c.busy} onPress={() => { void c.share(item, true); }} /></>}
      </Disclosure><InfoLink />
    </>;
  }
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Berqo" onPress={() => router.navigate('/')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Image source={require('../../../assets/berqo-logo.png')} style={{ width: 40, height: 40 }} accessibilityLabel="Berqo logo" /><Text style={s.brand}>Berqo</Text></View></Pressable><View style={s.headerActions}><Pressable accessibilityRole="button" accessibilityLabel={t('language')} onPress={() => { void c.preferences(c.language === 'en' ? 'hy' : 'en', c.location); }} disabled={c.busy}><Text style={s.language}>{c.language === 'en' ? 'Հայերեն' : 'English'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('infoTitle')} onPress={() => router.push('/about')} style={s.infoButton}><Text style={s.infoGlyph}>i</Text></Pressable></View></View>
    <ScrollView key={`${screen}-${params.id ?? ""}`} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {screen !== 'home' && <Pressable accessibilityRole="button" style={s.textAction} onPress={() => router.canGoBack() ? router.back() : router.navigate('/')}><Text style={s.link}>← {t('back')}</Text></Pressable>}
      {screen === 'home' && <>
        <View style={s.homeHero}><View style={s.heroCopy}><Text style={s.heroEyebrow}>{t('subtitle')}</Text><Text style={s.hero}>{t('title')}</Text><View style={s.connection}><View style={[s.dot, { backgroundColor: c.online ? '#A8CEAE' : colors.orange }]} /><Text style={s.heroHelp}>{t(c.online ? 'online' : 'offline')}</Text></View></View><View style={s.orchardArt}><View style={s.sun} /><View style={s.trunk} /><View style={s.treeCrown} /><View style={s.fruit1} /><View style={s.fruit2} /><View style={s.fruit3} /></View></View>
        <Text style={s.section}>{t('chooseCheck')}</Text><CheckChoices />
        {!c.metadata && <Card tinted><Text style={s.rowTitle}>{t('modelMissing')}</Text><Text style={s.small}>{t(c.modelError.includes('NATIVE_BUILD_REQUIRED') ? 'nativeRequired' : 'missingHelp')}</Text><Button secondary title={t('settings')} onPress={() => router.push('/settings')} /></Card>}
        <WeatherPanel /><View style={s.between}><Text style={s.section}>{t('recent')}</Text><Pressable accessibilityRole="button" style={s.textAction} onPress={() => router.push('/history')}><Text style={s.link}>{t('seeAll')} →</Text></Pressable></View>{c.observations.length ? c.observations.slice(0, 2).map(observationRow) : <Text style={s.body}>{t('empty')}</Text>}
        {c.inspections.slice(0, 1).map(walkRow)}
      </>}
      {screen === 'inspect' && <><Label>{t('captureStep')}</Label><Text style={s.heading}>{t('checkTree')}</Text><Capture /><Text style={s.small}>{t('weatherAuto')}</Text></>}
      {screen === 'result' && (c.draft ? <><Label>{t('resultStep')}</Label>{finding(c.draft, false)}</> : <Button title={t('start')} onPress={c.start} />)}
      {screen === 'passport' && (() => { const item = c.observations.find(o => o.id === params.id); return item ? <><Label>{t('savedStep')}</Label>{finding(item, true)}</> : <Text style={s.body}>{t('missingPassport')}</Text>; })()}
      {screen === 'collections' && <><Text style={s.heading}>{t('walks')}</Text><Text style={s.body}>{t('walkHelp')}</Text>
        <Button title={t('walkOrchard')} disabled={c.busy} onPress={() => { void c.startCollection(); }} />
        {!c.inspections.length && <Text style={s.body}>{t('noCollections')}</Text>}
        {c.inspections.map(walkRow)}
      </>}
      {screen === 'collection' && (() => { const item = c.inspections.find(inspection => inspection.id === params.id); return item ? <CollectionPanel key={item.id} inspection={item} /> : <Text style={s.body}>{t('missingPassport')}</Text>; })()}
      {screen === 'history' && <>
        <Text style={s.heading}>{t('records')}</Text><Label>{t('walks')}</Label>{c.inspections.length ? c.inspections.map(walkRow) : <Text style={s.small}>{t('noCollections')}</Text>}<Label>{t('checkTree')}</Label>
        {c.observations.length ? c.observations.map(observationRow) : <Text style={s.body}>{t('empty')}</Text>}
      </>}
      {screen === 'settings' && <>
        <Text style={s.heading}>{t('settings')}</Text>
        <LocationSettings key={`${c.location.latitude},${c.location.longitude}`} />
        <Disclosure title={t('model')}><Text style={s.rowTitle}>{t(c.metadata ? 'modelReady' : 'modelMissing')}</Text>
          {c.modelError.includes('NATIVE_BUILD_REQUIRED') && <Text style={s.small}>{t('nativeRequired')}</Text>}
          {c.metadata && <><Text style={s.small}>{c.metadata.modelId} · v{c.metadata.version}</Text><Text style={s.small}>{c.metadata.classes.join(', ')}</Text><Text style={s.small}>{t('thresholds')}</Text></>}
          <Text style={s.body}>{t('modelHelp')}</Text><Button title={t('importModel')} disabled={c.busy} onPress={() => { void c.installModel(); }} />
          <Text style={s.small}>{t('modelLimit')}</Text>
          {c.metadata?.trainingSources.map(source => <Source key={source.url} url={source.url} label={`${source.title} (${source.license})`} />)}
        </Disclosure>
        <Disclosure title={t('demoTools')}><Text style={s.demo}>{t('demo')}</Text><Text style={s.small}>{t('syncDemo')}</Text><Button secondary title={t('demoWeather')} onPress={() => { c.sampleWeather(); router.navigate('/'); }} /><Button secondary title={t('sync')} disabled={c.busy} onPress={() => { void c.sync(); }} /><Button secondary title={t('failDemo')} onPress={c.failNext} />{c.observations.map(item => <Button key={item.id} secondary title={`${t('queue')} · ${date(item.createdAt)}`} disabled={c.busy} onPress={() => { void c.queue(item); }} />)}</Disclosure><InfoLink />
      </>}
      {screen === 'about' && <><Text style={s.heading}>{t('infoTitle')}</Text><Card><Label>{t('safetyTitle')}</Label><Text style={s.body}>{t('warning')}</Text><Text style={s.body}>{t('modelLimit')}</Text><Text style={s.body}>{t('noTreatment')}</Text><Text style={s.small}>{t('samplingLimit')}</Text></Card><Card><Label>{t('weather')}</Label><Text style={s.body}>{t('weatherContextHelp')}</Text><Text style={s.small}>{t('weatherSnapshotHelp')}</Text></Card><Card><Label>{t('privacyTitle')}</Label><Text style={s.body}>{t('privacy')}</Text><Text style={s.small}>{t('reportReviewHelp')}</Text><Source url="https://open-meteo.com/en/terms" label="Open-Meteo · terms" /></Card></>}

    </ScrollView>
    {screen === 'result' && c.draft && <View style={s.primaryDock}><Button title={t('save')} disabled={c.busy} onPress={() => { void c.save(false); }} /></View>}
    <View style={s.nav}>{(['home', 'history', 'settings'] as const).map((tab, i) => { const active = screen === tab || (tab === 'history' && ['passport', 'collections', 'collection'].includes(screen)) || (tab === 'home' && ['inspect', 'result'].includes(screen)); return <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: active }} disabled={c.busy} onPress={() => router.navigate(tab === 'home' ? '/' : `/${tab}`)} style={s.navItem}><View style={[s.navPill, active && { backgroundColor: colors.pale }]}><Text style={[s.navGlyph, active && { color: colors.green }]}>{['♧', '▤', '☷'][i]}</Text></View><Text style={[s.navText, active && { color: colors.green, fontWeight: '700' }]}>{t(tab === 'home' ? 'orchard' : tab === 'history' ? 'records' : tab)}</Text></Pressable>; })}</View>
    {c.busy && <View style={s.overlay} accessibilityLiveRegion="polite"><ActivityIndicator size="large" color={colors.green} /><Text style={s.section}>{c.locating ? t('locating') : t('busy')}</Text></View>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 },
  brand: { color: colors.ink, fontWeight: '800', fontSize: 30, letterSpacing: -1.8 }, language: { color: colors.green, fontSize: 13, fontWeight: '600', padding: 10 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 32, gap: 18, width: '100%', maxWidth: 620, alignSelf: 'center' }, label: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  hero: { fontSize: 35, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: '#FFFDF5', maxWidth: '86%' }, heading: { fontSize: 30, lineHeight: 37, fontWeight: '700', color: colors.ink, letterSpacing: -.5 },
  homeHero: { backgroundColor: colors.ink, borderRadius: 28, padding: 24, overflow: 'hidden', minHeight: 212 }, heroCopy: { zIndex: 1, gap: 14 }, heroEyebrow: { color: '#B8D5B9', fontSize: 12, fontWeight: '700', letterSpacing: 1 }, heroHelp: { color: '#D3E5D5', fontSize: 12, lineHeight: 19, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' }, infoButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, infoGlyph: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.green, color: colors.green, textAlign: 'center', fontWeight: '700', fontSize: 16 }, textAction: { minHeight: 44, justifyContent: 'center' },
  findingHero: { backgroundColor: colors.ink, borderRadius: 24, padding: 24, gap: 14 }, attentionHero: { backgroundColor: '#5B402E' }, findingEyebrow: { fontSize: 13, lineHeight: 20, color: '#F0E7D9' }, findingTitle: { fontSize: 29, lineHeight: 36, fontWeight: '700', color: '#FFFDF5', letterSpacing: -.6 }, navPill: { width: 58, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  primaryDock: { paddingHorizontal: 20, paddingVertical: 10, width: '100%', maxWidth: 620, alignSelf: 'center' },
  section: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: colors.ink, marginTop: 6 }, body: { fontSize: 16, lineHeight: 25, color: colors.ink }, small: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 54, backgroundColor: colors.green, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' }, secondary: { backgroundColor: '#E9EEE3' },
  card: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 20, gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, link: { color: colors.green, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  orchardArt: { position: 'absolute', right: -8, bottom: 28, width: 106, height: 140, opacity: .5 }, sun: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: '#EFD896', right: -12, top: -48 }, trunk: { width: 8, height: 82, backgroundColor: '#A7BD96', position: 'absolute', bottom: 0, left: 49, borderRadius: 4 }, treeCrown: { width: 95, height: 97, borderRadius: 42, backgroundColor: '#6C9D79', position: 'absolute', top: 8 },
  artTree: { fontSize: 160, color: '#57744B', lineHeight: 165, top: -6 }, artText: { position: 'absolute', bottom: 15, left: 18, color: '#647554', fontSize: 10, letterSpacing: 2 },
  fruit1: { position: 'absolute', backgroundColor: colors.orange, width: 23, height: 23, borderRadius: 12, left: '47%', top: 57 }, fruit2: { position: 'absolute', backgroundColor: '#EBA15A', width: 20, height: 20, borderRadius: 10, left: '57%', top: 86 }, fruit3: { position: 'absolute', backgroundColor: '#F1BC67', width: 18, height: 18, borderRadius: 9, left: '36%', top: 85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 14 }, rowBody: { flex: 1, gap: 4 }, thumb: { width: 64, height: 70, borderRadius: 12, backgroundColor: colors.pale }, walkThumb: { width: 64, height: 70, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 23 }, arrow: { color: colors.green, fontSize: 22 }, status: { fontSize: 12, color: colors.green, lineHeight: 19 },
  photo: { width: '100%', height: 285, borderRadius: 24, backgroundColor: colors.pale, resizeMode: 'contain' }, tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, tag: { fontSize: 11, color: colors.green, backgroundColor: colors.pale, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 },
  score: { fontSize: 27, fontWeight: '700', color: colors.ink }, bar: { height: 6, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' }, barFill: { height: 6 },
  input: { borderWidth: 1, borderColor: '#CDD7C8', borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink, backgroundColor: '#FFFDF8' }, note: { minHeight: 95, textAlignVertical: 'top' },
  placeholder: { height: 235, backgroundColor: colors.pale, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B7C6AE', alignItems: 'center', justifyContent: 'center', gap: 16 }, placeholderGlyph: { fontSize: 48, color: '#8D9E81' },
  weatherNumber: { fontSize: 33, color: colors.ink, fontWeight: '600' }, demo: { fontSize: 12, color: '#965B13', fontWeight: '700' },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, paddingBottom: 8, backgroundColor: '#FFF' }, navItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 3, minHeight: 56 }, navGlyph: { fontSize: 23, color: colors.muted }, navText: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  footer: { color: '#96A18E', fontSize: 10, letterSpacing: 2, marginTop: 15, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: '#F7F5EFF5', justifyContent: 'center', alignItems: 'center', gap: 20, padding: 30 },
});
