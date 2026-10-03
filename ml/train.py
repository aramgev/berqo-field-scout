"""MobileNetV3 Small transfer learning + held-out metrics + mobile-compatible ONNX export."""
import argparse
import json
import random
import time
import zipfile
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from torchvision.transforms import InterpolationMode
from PIL import Image, ImageOps
import onnx
import onnxruntime as ort

MEAN, STD = [.485, .456, .406], [.229, .224, .225]
SOURCE = {'title': 'AgriVision-Apricot — Bilal Jan, version 1',
          'url': 'https://data.mendeley.com/datasets/5wk5wpzczw/1', 'license': 'CC BY 4.0'}

class Images(Dataset):
    def __init__(self, items, classes, train=False):
        self.items, self.classes = items, classes
        steps = [transforms.Resize((224, 224), interpolation=InterpolationMode.BILINEAR)]
        if train:
            steps += [transforms.RandomHorizontalFlip(), transforms.RandomRotation(12),
                      transforms.ColorJitter(brightness=.15, contrast=.15, saturation=.12)]
        self.transform = transforms.Compose(steps + [transforms.ToTensor(), transforms.Normalize(MEAN, STD)])
    def __len__(self): return len(self.items)
    def __getitem__(self, index):
        item = self.items[index]
        with Image.open(item['path']) as image:
            tensor = self.transform(ImageOps.exif_transpose(image).convert('RGB'))
        return tensor, self.classes.index(item['label'])

def score(model, loader, device):
    model.eval()
    predictions, targets, logits_all = [], [], []
    with torch.inference_mode():
        for inputs, labels in loader:
            logits = model(inputs.to(device)).cpu()
            predictions.extend(logits.argmax(1).tolist())
            targets.extend(labels.tolist())
            logits_all.append(logits)
    return np.array(predictions), np.array(targets), torch.cat(logits_all)

def metrics(predictions, targets, classes):
    confusion = np.zeros((len(classes), len(classes)), dtype=int)
    for actual, predicted in zip(targets, predictions): confusion[actual, predicted] += 1
    per_class = {}
    for i, name in enumerate(classes):
        tp = int(confusion[i, i]); precision = tp / max(1, int(confusion[:, i].sum()))
        recall = tp / max(1, int(confusion[i, :].sum()))
        per_class[name] = {'precision': precision, 'recall': recall,
                           'f1': 2 * precision * recall / max(1e-12, precision + recall),
                           'testCount': int(confusion[i, :].sum())}
    return {'accuracy': float((predictions == targets).mean()),
            'macroF1': float(np.mean([c['f1'] for c in per_class.values()])),
            'testCount': len(targets), 'perClass': per_class, 'confusionMatrix': confusion.tolist()}

def train(args):
    random.seed(42); np.random.seed(42); torch.manual_seed(42)
    torch.set_num_threads(min(8, max(1, torch.get_num_threads())))
    output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    classes = manifest['classes']
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Device: {device}; classes: {classes}', flush=True)
    datasets = {split: Images(items, classes, train=split == 'train') for split, items in manifest['splits'].items()}
    loaders = {split: DataLoader(data, batch_size=args.batch_size, shuffle=split == 'train', num_workers=0) for split, data in datasets.items()}
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    for parameter in model.features.parameters(): parameter.requires_grad = False
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(classes))
    model.to(device)
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=.001, weight_decay=.01)
    counts = np.bincount([classes.index(i['label']) for i in manifest['splits']['train']], minlength=len(classes))
    weights = torch.tensor(counts.sum() / (len(classes) * counts), dtype=torch.float32, device=device)
    loss_fn = nn.CrossEntropyLoss(weight=weights)
    best_f1 = -1
    start = time.time()
    for epoch in range(args.epochs):
        if epoch == args.epochs - args.fine_tune_epochs:
            for parameter in model.features[-3:].parameters(): parameter.requires_grad = True
            optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=.0001, weight_decay=.01)
        model.train(); model.features.eval()  # frozen batch-norm statistics on a small dataset
        running = 0.
        for inputs, labels in loaders['train']:
            optimizer.zero_grad(set_to_none=True)
            loss = loss_fn(model(inputs.to(device)), labels.to(device))
            loss.backward(); optimizer.step(); running += loss.item()
        predictions, targets, _ = score(model, loaders['val'], device)
        validation = metrics(predictions, targets, classes)
        print(f'Epoch {epoch + 1}/{args.epochs}: loss={running / len(loaders["train"]):.3f} val_accuracy={validation["accuracy"]:.3f} val_macro_f1={validation["macroF1"]:.3f}', flush=True)
        if validation['macroF1'] > best_f1:
            best_f1 = validation['macroF1']
            torch.save(model.state_dict(), output / 'best.pt')
    model.load_state_dict(torch.load(output / 'best.pt', map_location=device, weights_only=True))
    val_pred, val_targets, val_logits = score(model, loaders['val'], device)
    # Fit temperature on validation only. Test data is not used for tuning.
    temperatures = [.75, 1., 1.25, 1.5, 2., 2.5, 3.]
    temperature = min(temperatures, key=lambda t: nn.functional.cross_entropy(val_logits / t, torch.tensor(val_targets)).item())
    model = nn.Sequential(model, Temperature(temperature)).eval().to(device)
    probabilities = (val_logits / temperature).softmax(1)
    top_two = probabilities.topk(2, dim=1).values
    threshold, threshold_validated = 1., False
    for candidate in np.arange(.8, 1., .02):
        accepted = (top_two[:, 0] >= candidate) & ((top_two[:, 0] - top_two[:, 1]) >= .15)
        if 'unknown' in classes: accepted &= torch.tensor(val_pred != classes.index('unknown'))
        if int(accepted.sum()) >= 5 and float(torch.tensor(val_pred == val_targets)[accepted].float().mean()) >= .9:
            threshold, threshold_validated = float(candidate), True
            break
    predictions, targets, _ = score(model, loaders['test'], device)
    report = metrics(predictions, targets, classes)
    report.update({'classes': classes, 'validationMacroF1': best_f1, 'temperature': temperature,
                   'confidenceThreshold': threshold, 'thresholdValidationPassed': threshold_validated,
                   'trainingSeconds': time.time() - start, 'device': str(device), 'counts': manifest['counts']})
    model = model.cpu().eval()
    sample = torch.zeros(1, 3, 224, 224)
    torch.onnx.export(model, sample, str(output / 'model.onnx'), input_names=['image'], output_names=['logits'], opset_version=17, dynamo=False)
    onnx.checker.check_model(onnx.load(str(output / 'model.onnx')))
    session = ort.InferenceSession(str(output / 'model.onnx'), providers=['CPUExecutionProvider'])
    probe = datasets['test'][0][0].unsqueeze(0)
    with torch.inference_mode(): expected = model(probe).numpy()
    actual = session.run(['logits'], {'image': probe.numpy()})[0]
    if not np.allclose(expected, actual, atol=1e-4, rtol=1e-3): raise ValueError('ONNX / PyTorch parity failed')
    report['onnxParityMaxError'] = float(np.abs(expected - actual).max())
    report['modelBytes'] = (output / 'model.onnx').stat().st_size
    limitations = manifest['limitations'] + [
        'Research prototype: predictions are not diagnoses or treatment instructions.',
        'No independent validation on Armenian orchards. Similar symptoms and mixed problems may be confused.',
        'Confidence and margin do not reliably detect unsupported objects. Inspect only apricot.',
        'Only the listed classes are supported. Other apricot problems are not covered.',
        'Float32 model chosen for export reliability. Quantization deferred until accuracy is measured.',
        'Mobile JPEG resize can differ slightly from Pillow interpolation; real-device comparison is still required.']
    if not threshold_validated: limitations.append('Validation failed to establish >=90% selective precision with >=5 accepted samples. App rejects all results until more data/training is available.')
    metadata = {'modelId': 'berqo-apricot-mobilenetv3-small', 'version': args.version,
                'classes': classes, 'inputSize': 224, 'inputName': 'image', 'outputName': 'logits',
                'inputLayout': 'NCHW', 'outputType': 'logits', 'mean': MEAN, 'std': STD,
                'confidenceThreshold': threshold, 'marginThreshold': .15,
                'trainingSources': [SOURCE], 'limitations': limitations,
                'metrics': {k: report[k] for k in ['accuracy', 'macroF1', 'testCount']}}
    (output / 'metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    (output / 'metrics.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    # Preserve genuinely held-out photos for the demo, without redistributing the whole dataset.
    with zipfile.ZipFile(output / 'apricot-crop-pack.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in ['model.onnx', 'metadata.json', 'metrics.json']: archive.write(output / name, name)
        for label in classes:
            items = [i for i in manifest['splits']['test'] if i['label'] == label][:2]
            for i, item in enumerate(items):
                original = item.get('originalPath', item['path'])
                archive.write(original, f'held-out-demo/{label}-{i}{Path(original).suffix}')
    print(json.dumps(report, indent=2), flush=True)
    print(f'Export complete: {output / "apricot-crop-pack.zip"}', flush=True)

class Temperature(nn.Module):
    def __init__(self, value): super().__init__(); self.value = value
    def forward(self, inputs): return inputs / self.value

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', default='ml/outputs/manifest.json')
    parser.add_argument('--output', default='ml/outputs')
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--fine-tune-epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--version', default='0.1.0')
    args = parser.parse_args()
    if args.epochs < 1 or not 0 <= args.fine_tune_epochs <= args.epochs: parser.error('Invalid epoch counts')
    train(args)
