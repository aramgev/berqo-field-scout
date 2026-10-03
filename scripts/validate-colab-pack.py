"""Stage and verify a Colab crop pack without replacing the phone-tested release."""
import hashlib
import json
from pathlib import Path
import zipfile
import numpy as np
from PIL import Image, ImageOps
import onnx
import onnxruntime as ort

output = Path('ml/outputs/colab')
output.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile('apricot-crop-pack.zip') as archive:
    for filename in ('model.onnx', 'metadata.json', 'metrics.json'):
        entry = archive.getinfo(filename)
        if entry.file_size > 40 * 1024 * 1024:
            raise ValueError('Crop pack asset exceeds the mobile limit')
        (output / filename).write_bytes(archive.read(entry))
metadata = json.loads((output / 'metadata.json').read_text())
metrics = json.loads((output / 'metrics.json').read_text())
current = json.loads(Path('assets/models/metadata.txt').read_text(encoding='utf-8'))
for key in ('classes', 'inputSize', 'inputName', 'outputName', 'inputLayout', 'outputType', 'mean', 'std'):
    if metadata[key] != current[key]:
        raise ValueError(f'Mobile contract mismatch: {key}')
graph = onnx.load(str(output / 'model.onnx'))
onnx.checker.check_model(graph)
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(str(output / 'model.onnx'), options, providers=['CPUExecutionProvider'])
assert session.get_inputs()[0].shape == [1, 3, 224, 224]
assert session.get_outputs()[0].shape == [1, 4]
manifest = json.loads(Path('ml/outputs/manifest.json').read_text())
confusion = np.zeros((4, 4), dtype=np.int64)
accepted = correct_accepted = 0
for item in manifest['splits']['test']:
    with Image.open(item['path']) as image:
        image = ImageOps.exif_transpose(image).convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
        pixels = np.asarray(image, dtype=np.float32) / 255
    tensor = ((pixels - np.asarray(metadata['mean'], dtype=np.float32)) / np.asarray(metadata['std'], dtype=np.float32)).transpose(2, 0, 1)[None]
    logits = session.run([metadata['outputName']], {metadata['inputName']: tensor})[0][0]
    assert np.isfinite(logits).all()
    probabilities = np.exp(logits - logits.max())
    probabilities /= probabilities.sum()
    ranking = np.argsort(probabilities)[::-1]
    predicted = int(ranking[0])
    actual = metadata['classes'].index(item['label'])
    confusion[actual, predicted] += 1
    if probabilities[predicted] >= metadata['confidenceThreshold'] and probabilities[predicted] - probabilities[ranking[1]] >= metadata['marginThreshold']:
        accepted += 1
        correct_accepted += int(actual == predicted)
accuracy = float(confusion.trace() / confusion.sum())
f1 = [2 * confusion[i, i] / (confusion[i].sum() + confusion[:, i].sum()) for i in range(4)]
assert confusion.tolist() == metrics['confusionMatrix'], 'Local held-out predictions differ from the Colab report'
assert abs(accuracy - metrics['accuracy']) < 1e-8
assert abs(float(np.mean(f1)) - metrics['macroF1']) < 1e-8
# Both training runs used 0.1.0 by default; distinguish the different weights in future passports.
metadata['version'] = '0.1.1-colab'
(output / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
report = {'verified': True, 'modelVersion': metadata['version'], 'modelBytes': (output / 'model.onnx').stat().st_size,
          'sha256': hashlib.sha256((output / 'model.onnx').read_bytes()).hexdigest(),
          'accuracy': accuracy, 'macroF1': float(np.mean(f1)), 'testCount': int(confusion.sum()),
          'acceptedCount': accepted, 'acceptedAccuracy': correct_accepted / accepted if accepted else None,
          'bundledModelReplaced': False}
(output / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
