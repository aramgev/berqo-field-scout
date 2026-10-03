import { FieldObservation, ObservationRepository } from './domain';
export interface ObservationStore {
  keys(): Promise<string[]>;
  read(key: string): Promise<unknown>;
  write(key: string, value: FieldObservation): Promise<void>;
}
export class JsonObservationRepository implements ObservationRepository {
  constructor(private store: ObservationStore) {}
  async list(): Promise<FieldObservation[]> {
    const observations: FieldObservation[] = [];
    for (const key of await this.store.keys()) {
      const item = await this.store.read(key) as FieldObservation | null;
      if (item && item.schemaVersion === 1) observations.push(item);
    }
    return observations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async save(item: FieldObservation): Promise<void> {
    if (!/^[a-zA-Z0-9_-]+$/.test(item.id)) throw new Error('Invalid passport ID');
    await this.store.write(item.id, item);
  }
}
