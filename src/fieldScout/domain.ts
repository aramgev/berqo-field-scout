export type Language = 'en' | 'hy';
export type LocalText = Record<Language, string>;
export type Location = { latitude: number; longitude: number; accuracy?: number; source?: 'gps' | 'manual' | 'default'; recordedAt?: string };
export type Prediction = {
  conditionId: string; confidence: number; margin: number;
  modelId: string; modelVersion: string; elapsedMs: number;
};
export type ModelMetadata = {
  modelId: string; version: string; classes: string[]; inputSize: number;
  inputName: string; outputName: string; inputLayout: 'NCHW'; outputType: 'logits';
  mean: number[]; std: number[]; confidenceThreshold: number; marginThreshold: number;
  trainingSources: { title: string; url: string; license: string }[];
  limitations: string[]; metrics?: { accuracy: number; macroF1: number; testCount: number };
};
export type Advisory = { id: string; title: LocalText; summary: LocalText; sourceUrl?: string };
export type FieldObservation = {
  schemaVersion: 1; id: string; crop: 'apricot'; createdAt: string; imageUri: string;
  location?: Location; prediction?: Prediction; decision: 'possible' | 'uncertain' | 'unavailable';
  farmerNote: string; advisoryId: string;
  reviewStatus: 'not_requested' | 'queued_for_review' | 'submitted' | 'reviewed';
  syncStatus: 'local' | 'queued' | 'synced' | 'failed'; syncError?: string;
};
export type Weather = {
  fetchedAt: string; location: Location; source: 'open-meteo' | 'demo';
  hours: { time: string; temperature: number; rain: number; humidity: number }[];
  timezone?: string;
  days?: { date: string; minimum: number; maximum: number; rain: number }[];
};
export type OrchardRisk = { id: string; severity: 'attention' | 'watch'; title: LocalText; summary: LocalText; sourceUrl: string; demo: boolean };
export type OrchardInspection = {
  schemaVersion: 1; id: string; createdAt: string; location: Location;
  status: 'in_progress' | 'complete'; note: string; observations: FieldObservation[];
  weather?: Weather; weatherReason?: LocalText;
};
export interface CropClassifier { initialize(): Promise<ModelMetadata>; classify(imageUri: string): Promise<Prediction>; }
export interface ObservationRepository { list(): Promise<FieldObservation[]>; save(item: FieldObservation): Promise<void>; }
export interface WeatherService { refresh(location: Location): Promise<Weather>; cached(): Promise<Weather | null>; }
export interface LocationProvider { current(): Promise<Location>; }
export interface SyncAdapter { send(observation: FieldObservation): Promise<{ receiptId: string; reviewAccepted: boolean }>; }
