"""Preflight only. This is NOT a trained crop model and is never bundled into the app."""
from pathlib import Path
import numpy as np
import torch
from torchvision import models
import onnx
import onnxruntime as ort

output = Path('tmp/ml-preflight')
output.mkdir(parents=True, exist_ok=True)
torch.set_num_threads(4)
model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT).eval()
model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, 4)
model.eval()
sample = torch.zeros(1, 3, 224, 224)
torch.onnx.export(model, sample, str(output / 'export-check.onnx'), input_names=['image'], output_names=['logits'], opset_version=17, dynamo=False)
graph = onnx.load(str(output / 'export-check.onnx'))
onnx.checker.check_model(graph)
session = ort.InferenceSession(str(output / 'export-check.onnx'), providers=['CPUExecutionProvider'])
actual = session.run(['logits'], {'image': sample.numpy()})[0]
with torch.inference_mode(): expected = model(sample).numpy()
assert np.allclose(actual, expected, atol=1e-4, rtol=1e-3)
print({'preflight': 'passed', 'shape': actual.shape, 'bytes': (output / 'export-check.onnx').stat().st_size, 'irVersion': graph.ir_version, 'maxError': float(np.abs(actual - expected).max())})
print('This preflight has no crop accuracy and is excluded from release assets.')
