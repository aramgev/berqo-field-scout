"""Select actual held-out examples for rehearsal; never changes model thresholds or evaluation."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort

output = Path('demo/photos'); output.mkdir(parents=True, exist_ok=True)
manifest = json.loads(Path('ml/outputs/manifest.json').read_text())
meta = json.loads(Path('ml/outputs/metadata.json').read_text())
session = ort.InferenceSession('ml/outputs/model.onnx', providers=['CPUExecutionProvider'])
mean, std = np.array(meta['mean'], dtype=np.float32), np.array(meta['std'], dtype=np.float32)

def predict(image):
    pixels = np.asarray(image.resize((224, 224), Image.Resampling.BILINEAR), dtype=np.float32) / 255
    tensor = ((pixels - mean) / std).transpose(2, 0, 1)[None].copy()
    logits = session.run(['logits'], {'image': tensor})[0][0]
    probabilities = np.exp(logits - logits.max()); probabilities /= probabilities.sum()
    indices = np.argsort(probabilities)[::-1]
    index = int(indices[0]); confidence = float(probabilities[index]); margin = confidence - float(probabilities[indices[1]])
    return {'predictedClass': meta['classes'][index], 'confidence': confidence, 'margin': margin,
            'accepted': confidence >= meta['confidenceThreshold'] and margin >= meta['marginThreshold']}

candidates = []
for item in manifest['splits']['test']:
    with Image.open(item['path']) as image:
        result = predict(image.convert('RGB'))
    candidates.append((item, result))
selected = []
for label in meta['classes']:
    examples = [(item, result) for item, result in candidates if item['label'] == label and result['predictedClass'] == label and result['accepted']]
    if examples: selected.append((f'{label}.jpg', max(examples, key=lambda pair: pair[1]['confidence'])[0]))
uncertain = [(item, result) for item, result in candidates if not result['accepted']]
if uncertain: selected.append(('uncertain_apricot.jpg', min(uncertain, key=lambda pair: pair[1]['confidence'])[0]))
report = []
for filename, item in selected:
    with Image.open(item.get('originalPath', item['path'])) as source:
        image = ImageOps.exif_transpose(source).convert('RGB'); image.thumbnail((1600, 1600), Image.Resampling.BILINEAR)
        image.save(output / filename, quality=90)
    with Image.open(output / filename) as image: result = predict(image.convert('RGB'))
    report.append({'file': filename, 'datasetLabel': item['label'], **result, 'originalSha256': item['sha256']})
Image.new('RGB', (800, 800), (20, 20, 20)).save(output / 'blank_photo.jpg')
(output.parent / 'examples.json').write_text(json.dumps({'modelVersion': meta['version'], 'selection': 'Illustrative held-out examples selected for rehearsal, not an unbiased accuracy estimate. Mobile JPEG processing may change scores.', 'examples': report}, indent=2))
print(json.dumps(report, indent=2))
