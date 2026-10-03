import fs from 'node:fs';
import path from 'node:path';
const source = path.resolve(process.argv[2] ?? 'ml/outputs');
const meta = JSON.parse(fs.readFileSync(path.join(source, 'metadata.json'), 'utf8'));
if (meta.inputSize !== 224 || meta.inputLayout !== 'NCHW' || meta.outputType !== 'logits' || meta.classes.length < 2)
  throw new Error('Incompatible metadata. Export using ml/train.py.');
const model = path.join(source, 'model.onnx');
if (fs.statSync(model).size < 1000 || fs.statSync(model).size > 40 * 1024 * 1024) throw new Error('Expected model between 1 KB and 40 MB');
const destination = path.resolve('assets/models');
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(model, path.join(destination, 'apricot.onnx'));
// Use .txt so Metro treats metadata as a file asset instead of an inline JS object.
fs.writeFileSync(path.join(destination, 'metadata.txt'), JSON.stringify(meta));
if (fs.existsSync(path.join(source, 'metrics.json'))) fs.copyFileSync(path.join(source, 'metrics.json'), path.join(destination, 'metrics.json'));
console.log(`Bundled ${meta.modelId} ${meta.version}, ${meta.classes.length} classes. Build the APK next.`);
