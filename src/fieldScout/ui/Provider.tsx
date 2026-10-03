import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { FieldObservation, Language, Location, ModelMetadata, Weather } from '../domain';
import { TextKey, translate } from '../i18n';
import { ApricotOnnxClassifier } from '../adapters/classifier';
import { FileObservationRepository, ensureStorage, persistPhoto, readJson, root, writeJson } from '../adapters/storage';
import { OpenMeteoWeather, demoWeather } from '../adapters/weather';
import { LocalDemoSync } from '../adapters/demoSync';
import { ObservationSync } from '../sync';
import { decide } from '../safety';
import { PhoneLocation } from '../adapters/location';
import { sameLocation } from '../forecast';
const repository = new FileObservationRepository();
const classifier = new ApricotOnnxClassifier();
const weatherService = new OpenMeteoWeather();
const locationProvider = new PhoneLocation();
const demoAdapter = new LocalDemoSync();
const syncService = new ObservationSync(repository, demoAdapter);
function useScoutState() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [location, setLocation] = useState<Location>({ latitude: 40.15, longitude: 44.04, source: 'default' });
  const [locating, setLocating] = useState(false);
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [modelError, setModelError] = useState('MODEL_MISSING');
  const [photo, setPhoto] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldObservation | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);
  const network = Network.useNetworkState();
  const online = !!network.isConnected && network.isInternetReachable !== false;
  const t = (key: TextKey) => translate(language, key);
  function errorMessage(e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('MODEL_MISSING')) return t('missingHelp');
    if (message.includes('NATIVE_BUILD_REQUIRED')) return t('nativeRequired');
    if (message.includes('PHOTO_QUALITY')) return t('quality');
    if (message.includes('GPS_DENIED')) return t('gpsDenied');
    if (message.includes('GPS_OFF')) return t('gpsOff');
    if (message.includes('GPS_TIMEOUT')) return t('gpsTimeout');
    if (message.includes('WEATHER_FAILED')) return t('weatherFailed');
    return message;
  }
  async function task(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await action(); } catch (e) { Alert.alert(t('error'), errorMessage(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function reload() { setObservations(await repository.list()); }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureStorage();
      const [items, cachedWeather, preferences] = await Promise.all([repository.list(), weatherService.cached(), readJson<{ language: Language; location: Location }>(`${root}preferences.json`)]);
      if (!alive) return;
      setObservations(items);
      const savedLocation = preferences?.location ?? { latitude: 40.15, longitude: 44.04, source: 'default' };
      setWeather(cachedWeather && sameLocation(cachedWeather.location, savedLocation) ? cachedWeather : null);
      if (preferences) { setLanguage(preferences.language); setLocation(preferences.location); }
      try { const model = await classifier.initialize(); if (alive) { setMetadata(model); setModelError(''); } }
      catch (e) { if (alive) setModelError(e instanceof Error ? e.message : String(e)); }
    })().catch(e => { if (alive) Alert.alert('Storage', String(e)); });
    return () => { alive = false; };
  }, []);
  function start() { setPhoto(null); setDraft(null); setNote(''); router.push('/inspect'); }
  async function choosePhoto(camera: boolean) {
    await task(async () => {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { Alert.alert(t('error'), t('permission')); return; }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
      const picked = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled) return;
      const asset = picked.assets[0];
      // Preserve aspect ratio for the saved evidence. Model input is resized separately.
      const image = ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1600 || asset.height > 1600) image.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
      const rendered = await image.renderAsync();
      const normalized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: .9 });
      setPhoto(normalized.uri); setDraft(null); setNote('');
    });
  }
  async function analyze() {
    if (!photo) return;
    await task(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 40));
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const base: FieldObservation = { schemaVersion: 1, id, crop: 'apricot', createdAt: new Date().toISOString(),
        imageUri: photo, location: { ...location }, decision: 'unavailable', farmerNote: '', advisoryId: 'unavailable', reviewStatus: 'not_requested', syncStatus: 'local' };
      if (metadata) {
        const prediction = await classifier.classify(photo);
        const decision = decide(prediction, metadata);
        setDraft({ ...base, prediction, decision, advisoryId: decision === 'possible' ? prediction.conditionId : 'uncertain' });
      } else setDraft(base);
      router.push('/result');
    });
  }
  async function save(review: boolean) {
    if (!draft) return;
    await task(async () => {
      const imageUri = await persistPhoto(draft.imageUri, draft.id);
      const saved: FieldObservation = { ...draft, imageUri, farmerNote: note.trim(),
        reviewStatus: review ? 'queued_for_review' : 'not_requested', syncStatus: review ? 'queued' : 'local' };
      await repository.save(saved); await reload(); setDraft(null); setPhoto(null); setNote('');
      router.replace(`/passport/${saved.id}`);
    });
  }
  async function queue(item: FieldObservation, review = false) {
    await task(async () => {
      await repository.save({ ...item, syncStatus: 'queued', syncError: undefined,
        reviewStatus: review ? 'queued_for_review' : item.reviewStatus }); await reload();
    });
  }
  async function sync() { await task(async () => { await syncService.run(); await reload(); }); }
  async function fetchWeather(nextLocation: Location) {
    try { setWeather(await weatherService.refresh(nextLocation)); setNow(Date.now()); }
    catch { throw new Error('WEATHER_FAILED'); }
  }
  async function refreshWeather() { await task(async () => fetchWeather(location)); }
  async function useGps() {
    await task(async () => {
      setLocating(true);
      try {
        const fix = await locationProvider.current();
        await writeJson(`${root}preferences.json`, { language, location: fix });
        setLocation(fix);
        if (!sameLocation(location, fix)) { setWeather(null); await writeJson(`${root}weather.json`, null); }
        setLocating(false);
        if (online) await fetchWeather(fix);
        else Alert.alert(t('location'), t('gpsOffline'));
      } finally { setLocating(false); }
    });
  }
  async function preferences(nextLanguage: Language, nextLocation: Location) {
    await task(async () => {
      if (!Number.isFinite(nextLocation.latitude) || !Number.isFinite(nextLocation.longitude) || Math.abs(nextLocation.latitude) > 90 || Math.abs(nextLocation.longitude) > 180) throw new Error('Invalid coordinates');
      await writeJson(`${root}preferences.json`, { language: nextLanguage, location: nextLocation });
      const changed = nextLocation.latitude !== location.latitude || nextLocation.longitude !== location.longitude;
      setLanguage(nextLanguage); setLocation(nextLocation);
      if (changed) { setWeather(null); await writeJson(`${root}weather.json`, null); }
    });
  }
  async function installModel() {
    await task(async () => {
      if (Platform.OS === 'web') throw new Error('NATIVE_BUILD_REQUIRED');
      const explain = (title: string, message: string) => new Promise<boolean>(resolve => {
        Alert.alert(title, message, [{ text: t('ok'), onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) });
      });
      if (!(await explain(t('chooseModel'), t('modelHelp')))) return;
      const model = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (model.canceled) return;
      if (!(await explain(t('chooseMetadata'), 'metadata.json'))) return;
      const meta = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (meta.canceled) return;
      const installed = await classifier.install(model.assets[0].uri, meta.assets[0].uri);
      setMetadata(installed); setModelError(''); Alert.alert(t('model'), t('modelInstalled'));
    });
  }
  async function share(item: FieldObservation, image: boolean) {
    await task(async () => {
      if (Platform.OS === 'web') throw new Error('NATIVE_BUILD_REQUIRED');
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable on this device');
      let uri = item.imageUri;
      if (!image) {
        uri = `${root}exports/passport-${item.id}.json`;
        await writeJson(uri, { ...item, imageUri: undefined, imageFile: `${item.id}.jpg`, exportNote: 'Share photo separately. Review status is local; no expert has received it.' });
      }
      await Sharing.shareAsync(uri, { mimeType: image ? 'image/jpeg' : 'application/json', dialogTitle: t('saved') });
    });
  }
  return { language, location, observations, weather, metadata, modelError, photo, draft, note, setNote, busy, locating, online, now, t,
    start, choosePhoto, analyze, save, queue, sync, refreshWeather, useGps, preferences, installModel, share,
    sampleWeather: () => setWeather(demoWeather(location)), failNext: () => { demoAdapter.failNext = true; Alert.alert(t('demo'), t('failDemo')); } };
}
type State = ReturnType<typeof useScoutState>;
const Context = createContext<State | null>(null);
export function FieldScoutProvider({ children }: React.PropsWithChildren) { const state = useScoutState(); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useScout() { const state = useContext(Context); if (!state) throw new Error('FieldScoutProvider is required'); return state; }
