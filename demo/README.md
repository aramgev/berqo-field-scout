# Photos for the phone demo

Copy `photos/` onto the Android phone (USB, Drive or another transfer you choose), then select a photo from the app. No camera is required. The app's trained model is already bundled into the APK.

These are **selected held-out dataset examples for illustrating the workflow**, not an unbiased accuracy estimate. See `assets/models/metrics.json` for evaluation over all 78 held-out images. `examples.json` records desktop scores; phone JPEG processing can change them.

Try `shot_hole_leaves.jpg` for a likely finding, `uncertain_apricot.jpg` for uncertainty, and `blank_photo.jpg` for the quality gate. The other named photos illustrate the remaining supported classes. Names indicate dataset labels, not independently confirmed diagnoses.

Attribution: Jan, Bilal (2026), “AgriVision-Apricot”, Mendeley Data, V1, DOI 10.17632/5wk5wpzczw.1, https://data.mendeley.com/datasets/5wk5wpzczw/1, **CC BY 4.0**. Images are resized to at most 1600 pixels and converted to JPEG for transfer. The artificial dark blank photo is generated solely to test poor-image handling. Retain attribution if redistributing these examples.
