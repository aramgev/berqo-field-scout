# NotebookLM technical video instructions

Upload output/pdf/Berqo_Technical_Architecture.pdf as a source to a new NotebookLM notebook. The matching Markdown source docs/TECHNICAL_ARCHITECTURE.md can also be uploaded. The PDF contains rendered diagrams and selectable text. Upload assets/berqo-logo.png separately if you want the original brand image as another source. These files contain technical project details, not personal phone coordinates or farmer photos.

In Studio, choose Video Overview, use the Explainer format, and paste the following steering prompt. Select English or Armenian as desired. Available controls and generation time depend on your account. Review factual claims and labels before submitting the generated video to the jury. Add a separate real app screen recording to demonstrate behavior.

## Steering prompt

Create a technical explainer for a hackathon jury about Berqo, the Android-first React Native apricot inspection MVP described in the architecture source. Aim for approximately five minutes; prioritize accuracy if the format chooses a different duration. Use the supplied green bird-and-apricot logo, clear architecture diagrams, and legible labels.

Explain the farmer photo-upload journey, then the four-layer architecture, the local image-processing path, the 224 x 224 RGB Float32 tensor, MobileNetV3 Small, ONNX Runtime CPU execution, stable softmax, the 0.80 score and 0.15 margin gates, and uncertain-result handling. Explain local JPEG/JSON Field Passport persistence and user-initiated sharing. Make it clear that photos are not sent to cloud AI.

Explain foreground phone location, coordinates sent to Open-Meteo, the three-day forecast, six upcoming hourly readings, the 24-hour cache freshness policy, and transparent next-48-hour frost, rain and soil-moisture inspection suggestions. GPS is user-triggered; there is no continuous background tracking.

Present the bundled model's measured 85.90 percent accuracy and 87.43 percent macro-F1 on 78 held-out images. State that this is a random dataset-image split, not independent Armenian orchard validation. The bundled pack is 0.1.0 and approximately 6.1 MB; the separate Colab pack is staged, not the default. The single 112 ms device observation is not a guaranteed latency or a benchmark.

Explain the replaceable CropClassifier, ObservationRepository, LocationProvider, WeatherService and SyncAdapter interfaces as the future Berqo integration boundary. Label the current expert sync as a local demonstration with no real agronomist backend. Label authenticated integration, production validation, broader crop coverage, iOS delivery and commercial deployment as future work. Do not invent cloud services, continuous tracking, pesticide prescriptions, treatment efficacy, perfect unknown-object detection or production accuracy.

End with installing the standalone signed Android APK and a real offline photo-analysis and saved-Passport demo. Distinguish source-described behavior from what was physically confirmed. Follow the source's implemented/measured/pending/future labels throughout.
