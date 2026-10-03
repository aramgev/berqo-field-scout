import * as FS from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { FieldObservation } from '../domain';
import { JsonObservationRepository } from '../repository';
export const root = Platform.OS === 'web' ? 'berqo-preview/' : `${FS.documentDirectory}field-scout/`;
export async function ensureStorage() {
  if (Platform.OS === 'web') return;
  if (!FS.documentDirectory) throw new Error('Use the Android app for offline storage.');
  for (const dir of ['', 'observations/', 'photos/', 'models/', 'exports/'])
    await FS.makeDirectoryAsync(`${root}${dir}`, { intermediates: true });
}
export async function readJson<T>(path: string): Promise<T | null> {
  if (Platform.OS === 'web') { const value = localStorage.getItem(path); return value ? JSON.parse(value) as T : null; }
  if (!(await FS.getInfoAsync(path)).exists) return null;
  return JSON.parse(await FS.readAsStringAsync(path)) as T;
}
let writeQueue = Promise.resolve();
export function writeJson(path: string, value: unknown): Promise<void> {
  const operation = writeQueue.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') { localStorage.setItem(path, JSON.stringify(value)); return; }
    await ensureStorage();
    const temp = `${path}.tmp`;
    await FS.writeAsStringAsync(temp, JSON.stringify(value));
    await FS.moveAsync({ from: temp, to: path });
  });
  writeQueue = operation;
  return operation;
}
export class FileObservationRepository extends JsonObservationRepository {
  constructor() {
    super({
      keys: async () => {
        if (Platform.OS === 'web') return Object.keys(localStorage).filter(k => k.startsWith(`${root}observations/`) && k.endsWith('.json')).map(k => k.slice(`${root}observations/`.length, -5));
        await ensureStorage(); return (await FS.readDirectoryAsync(`${root}observations/`)).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
      },
      read: key => readJson<FieldObservation>(`${root}observations/${key}.json`),
      write: (key, item) => writeJson(`${root}observations/${key}.json`, item),
    });
  }
}
export async function persistPhoto(uri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  }
  await ensureStorage();
  const target = `${root}photos/${id}.jpg`;
  await FS.copyAsync({ from: uri, to: target });
  return target;
}
