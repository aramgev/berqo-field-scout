import { Asset } from 'expo-asset';
import { NativeModules, Platform } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { bundledMetadata, bundledModel } from '../../../assets/models/bundled';
import { CropClassifier, ModelMetadata, Prediction } from '../domain';
import { rankLogits, validateMetadata } from '../safety';
import { imageTensor } from '../ml/preprocess';
import { ensureStorage, readJson, root, writeJson } from './storage';
type Runtime = typeof import('onnxruntime-react-native');
function nativeRuntime(): Runtime {
  // ORT installs its JSI binding at import time. Guard missing registration before Metro evaluates it.
  // This also keeps Expo Go usable for photo recording without a fatal native import.
  if (!NativeModules.Onnxruntime || typeof NativeModules.Onnxruntime.install !== 'function') throw new Error('NATIVE_BUILD_REQUIRED');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('onnxruntime-react-native') as Runtime;
}
export class ApricotOnnxClassifier implements CropClassifier {
  private session?: import('onnxruntime-react-native').InferenceSession;
  private metadata?: ModelMetadata;
  private runtime?: Runtime;
  private initializing?: Promise<ModelMetadata>;
  initialize(): Promise<ModelMetadata> {
    if (this.session && this.metadata) return Promise.resolve(this.metadata);
    if (!this.initializing) this.initializing = this.load().finally(() => { this.initializing = undefined; });
    return this.initializing;
  }
  private async load(): Promise<ModelMetadata> {
    if (Platform.OS === 'web') throw new Error('NATIVE_BUILD_REQUIRED');
    await ensureStorage();
    let descriptor = await readJson<{ path: string; metadata: ModelMetadata }>(`${root}active-model.json`);
    if (!descriptor && bundledModel !== null && bundledMetadata !== null) {
      const model = Asset.fromModule(bundledModel);
      const meta = Asset.fromModule(bundledMetadata);
      await Promise.all([model.downloadAsync(), meta.downloadAsync()]);
      descriptor = { path: model.localUri!, metadata: JSON.parse(await FS.readAsStringAsync(meta.localUri!)) };
    }
    if (!descriptor) throw new Error('MODEL_MISSING');
    const metadata = validateMetadata(descriptor.metadata);
    // Load lazily so Expo Go can still record photos without the custom native runtime.
    try { this.runtime = nativeRuntime(); }
    catch { throw new Error('NATIVE_BUILD_REQUIRED'); }
    this.session = await this.runtime.InferenceSession.create(descriptor.path, { executionProviders: ['cpu'] });
    if (this.session.inputNames.length !== 1 || this.session.inputNames[0] !== metadata.inputName
      || this.session.outputNames[0] !== metadata.outputName) { await this.session.release(); this.session = undefined; throw new Error('Model tensor names do not match metadata'); }
    this.metadata = metadata;
    return metadata;
  }
  async install(modelUri: string, metadataUri: string): Promise<ModelMetadata> {
    if (Platform.OS === 'web') throw new Error('NATIVE_BUILD_REQUIRED');
    await ensureStorage();
    const meta = validateMetadata(JSON.parse(await FS.readAsStringAsync(metadataUri)));
    const info = await FS.getInfoAsync(modelUri);
    if (!info.exists || !('size' in info) || info.size > 40 * 1024 * 1024 || info.size < 1000) throw new Error('Expected a real ONNX model smaller than 40 MB');
    // Verify the new session before switching the active descriptor.
    let runtime: Runtime;
    try { runtime = nativeRuntime(); } catch { throw new Error('NATIVE_BUILD_REQUIRED'); }
    const path = `${root}models/apricot-${Date.now()}.onnx`;
    await FS.copyAsync({ from: modelUri, to: path });
    const session = await runtime.InferenceSession.create(path, { executionProviders: ['cpu'] });
    try {
      const output = await session.run({ [meta.inputName]: new runtime.Tensor('float32', new Float32Array(3 * 224 * 224), [1, 3, 224, 224]) });
      if (!output[meta.outputName] || output[meta.outputName].data.length !== meta.classes.length) throw new Error('Model class count mismatch');
      rankLogits(output[meta.outputName].data as Float32Array);
      await writeJson(`${root}active-model.json`, { path, metadata: meta });
      if (this.session) await this.session.release();
      this.session = session; this.runtime = runtime; this.metadata = meta;
      return meta;
    } catch (e) { await session.release(); await FS.deleteAsync(path, { idempotent: true }); throw e; }
  }
  async classify(imageUri: string): Promise<Prediction> {
    const meta = await this.initialize();
    const start = Date.now();
    const context = ImageManipulator.manipulate(imageUri);
    context.resize({ width: meta.inputSize, height: meta.inputSize });
    const rendered = await context.renderAsync();
    const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
    if (!image.base64) throw new Error('Could not decode photo');
    const tensor = imageTensor(image.base64, meta.inputSize, meta.mean, meta.std);
    // JPEG decoding is bounded at 224x224; native inference runs asynchronously.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const output = await this.session!.run({ [meta.inputName]: new this.runtime!.Tensor('float32', tensor, [1, 3, meta.inputSize, meta.inputSize]) });
    const logits = output[meta.outputName]?.data as Float32Array;
    if (!logits || logits.length !== meta.classes.length) throw new Error('Model output class mismatch');
    const ranked = rankLogits(logits);
    return { conditionId: meta.classes[ranked.index], confidence: ranked.confidence, margin: ranked.margin,
      modelId: meta.modelId, modelVersion: meta.version, elapsedMs: Date.now() - start };
  }
}
