# Apricot model 0.1.0

Architecture: ImageNet-pretrained MobileNetV3 Small, four-class head, float32 ONNX opset 17 / IR 8. Input `image`: `[1,3,224,224]` RGB NCHW, direct square resize, mean `[0.485,0.456,0.406]`, std `[0.229,0.224,0.225]`. Output `logits`; validation-fitted temperature 1.0. Class order is in `metadata.txt`.

Source: Jan, Bilal (2026), “AgriVision-Apricot”, Mendeley Data, V1, DOI 10.17632/5wk5wpzczw.1, https://data.mendeley.com/datasets/5wk5wpzczw/1, **CC BY 4.0**. Original/baseline images only. Selected healthy appearance, brown rot, shot hole on leaves and shot hole on fruit. Dataset labels are visual annotations, not laboratory-confirmed diagnoses.

Data: 528 original selected images; 16 exact/identical perceptual-hash duplicates removed. Remaining 512 images: 356 train, 78 validation, 78 test. Split seed 42. No test images used to select the checkpoint, temperature or thresholds. Ten epochs, last three fine-tuning the final feature blocks. Local CPU training took about 99 seconds after image preparation.

Held-out results: **85.90% accuracy**, **87.43% macro-F1**. Per-class recall: healthy 91.67% (24 test images), brown rot 85.71% (7), shot hole leaves 100% (21), shot hole fruit 69.23% (26). Healthy precision is only 73.33%; some diseased fruit was classified as healthy appearance. The UI therefore never promises absence of disease. Full precision/recall/F1/confusion matrix is in `metrics.json`.

Size: 6,098,545 bytes. Desktop ONNX/PyTorch maximum logit difference on the export probe: 0.0000162. Model score threshold 0.80 and top-two margin 0.15 selected using validation. These gates do not guarantee correctness or unsupported-object rejection. Physical Android preprocessing, inference time and airplane-mode cold launch still need to be tested on the demo phone.

Limitations: random image splitting can retain related scenes from the same orchard/tree. No independent Armenian orchard evaluation. Only four conditions supported; mixed symptoms and other apricot disorders may be confused. Non-apricot objects can get high scores. Use this for documenting observations and prompting expert review, not diagnosis or treatment. No pesticide instructions or autonomous action. Confidence is a model score, not a guaranteed probability of disease.

License: training images/examples are CC BY 4.0 and require attribution. This card retains provenance for the exported weights and demo photos. Code dependencies and pretrained torchvision weights retain their upstream terms. No private Berqo data/code is included.
