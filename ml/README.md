# Apricot crop pack

Open `Berqo_Apricot_Training.ipynb` in Google Colab, select a GPU, and run the cells. The notebook is self-contained. Regenerate it after editing scripts with `python scripts/create-colab.py`.

Use original/baseline images from AgriVision-Apricot v1 (Bilal Jan, CC BY 4.0). Expected folder names include `healthy`, `brown_rot`, `shot_hole_leaves` and `shot_hole_fruit`. The preparer scans recursively, so point it at the baseline folder or extracted dataset root. It skips paths containing `augment`, reports counts/corrupt files, removes exact and identical perceptual-hash duplicates, and rejects conflicting duplicate labels. It normalizes `gummosis_and_galls` to the crop-pack's `gumosis_and_galls` spelling.

Random image splitting does **not** establish orchard-independent generalization. If tree/orchard IDs become available, replace the split with grouping by those IDs. Do not mix augmented copies across train/validation/test. Inspect sample photos manually before trusting labels. Validate on Armenian orchard photos before a production deployment.

The validation split chooses the best macro-F1 checkpoint, temperature scaling, and a conservative confidence threshold. Test images are used only for final metrics. If fewer than five validation observations reach 90% selective precision, the crop pack uses a threshold of 1.0 and documents the failure. This sample requirement is still too small for production reliability.

Outputs:

- `manifest.json`: class counts, split paths, deduplication and limits (local-only; do not publish absolute paths).
- `best.pt`: local checkpoint.
- `model.onnx`: float32 MobileNetV3 Small, opset 17, static `[1,3,224,224]` input `image`, output `logits`. Temperature scaling is included in the exported graph.
- `metadata.json`: class order, normalization, thresholds, attribution, version and actual metrics.
- `metrics.json`: held-out accuracy, macro-F1, per-class precision/recall/F1, confusion matrix and ONNX/PyTorch comparison.
- `apricot-crop-pack.zip`: model/metadata/metrics plus two held-out photos per class for phone testing.

The mobile model importer validates metadata, file size, runtime loading and output dimensions before switching packs. The public APK can embed the pack with `npm run bundle:model`.

No generated confidence, accuracy or latency is reported as measured. CPU time and GPU availability vary; keep the first run small, check validation, and freeze model changes before the demo. Production needs more data, a stronger unsupported-image policy, image-preprocessing parity testing and agronomist validation.
