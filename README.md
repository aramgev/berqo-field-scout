# Berqo

Working source update, 5 October 2026: the redesigned Check one tree / Walk the orchard experience, automatic saved-weather context and curated care steps are not yet included in the APK or jury ZIP linked below. The link remains the latest built 1.0.5 release. Replace the APK, jury pack and NotebookLM snapshots after packaging and phone verification.

Standalone public-safe React Native app for apricot growers: select/capture a photo, run a small model locally, communicate uncertainty, save a Field Passport and inspect weather reminders. English and Armenian. No account, AI API key or private Berqo service is needed inside the app.

## Current readiness

The signed standalone Android **1.0.5 ARM64 APK** is ready: [download APK](https://expo.dev/artifacts/eas/BA65leTci40sa9Q-SrVxiU1ST83Z59dsEpoQ9LSdURA.apk), [build record](https://expo.dev/accounts/aram_am/projects/berqo-field-scout/builds/3fc87a87-21ef-424a-b67f-ba18b506b560). It is approximately 71.7 MiB (75 MB) and targets modern ARM64 Android phones. A local copy is saved as `dist/Berqo-Field-Scout.apk`; preserve it because the hosted build has a retention limit. The preceding 1.0.2 release was installed and tested on a Galaxy S25 running Android 16: the user confirmed model readiness, photo analysis in airplane mode, and saved Passport persistence after reopening. One captured Passport displayed 112 ms for photo processing plus inference; this single observation is not a performance benchmark.

The application includes a **real trained 6.1 MB apricot model** in `assets/models/`. On 78 held-out dataset images it measured 85.9% accuracy and 87.4% macro-F1; see `assets/models/metrics.json`. This is a random image split, not independent Armenian orchard validation. No mock classifier is substituted. Basic physical Android offline acceptance passed; remaining broader checks are in `docs/DEVICE_CHECKLIST.md`.

Version 1.0.3 was checked on the same phone. Native UI inspection confirmed a real phone location fix (±33 m reported accuracy) and a fresh Open-Meteo forecast in Asia/Yerevan. The updated forecast cache/offline reopening check is awaiting user confirmation.

Version 1.0.5 passed lint, typecheck, all 20 application tests and signed APK/model/native alignment checks. Its USB update attempt timed out while Play Protect was open; the phone still reports 1.0.4. The new APK is also in the phone's Downloads/Berqo-1.0.5.apk. New collection/report phone acceptance and a single-photo regression check on this release remain pending manual installation.

## Quick start

### Guided inspections and readable reports

Version 1.0.5 adds an independent **Guided inspections** screen, also accessible through a weather reminder. Upload and analyze one photo for each of up to five different trees; added entries are saved immediately and can be resumed after reopening. Finish after one to five samples. Counts describe photos and preserve uncertainty; they do not measure orchard infection prevalence. The original single-photo workflow stays separate.

Saved Passports and guided collections offer a readable report preview, **Share text summary**, and **Share readable report with photos**. The photo report is a self-contained HTML attachment with embedded thumbnails for a recipient to open in a browser. Coordinates are excluded by default from these new reports; enable the explicit switch if needed. Existing Passport JSON sharing keeps its previous behavior. No expert receives anything automatically and no new training or dependencies are required.

```powershell
npm ci
npm start
```

Expo Go previews the screens and photo/passport flow. **Offline inference requires the standalone APK** because ONNX Runtime is native. `npm run build:android` uses EAS cloud builds and does not require Android Studio on this computer. A free EAS account may have queue delays; check availability early. No web inference is implemented.

### Optional retraining

The supplied Colab result has also been verified locally against all 78 held-out images. It measured the same 85.90% accuracy and slightly higher macro-F1 (87.60%, versus the bundled model's 87.43%). Its compatible model and versioned metadata are staged in `ml/outputs/colab/` as `0.1.1-colab`; the phone-tested bundled release remains unchanged. To test this pack without rebuilding, copy `ml/outputs/colab/model.onnx` and `ml/outputs/colab/metadata.json` to the phone, then select them in Settings → Install apricot model. Repeat the offline phone test before using it for judging. Do not apply temperature scaling again: it is already included in the exported logits.

The real crop pack is already trained locally and bundled. **Skip this section for the current demo**: no Colab account, additional training, model import or AI API key is required. These steps are provided for later retraining or replacing the crop pack.

1. Download [AgriVision-Apricot v1](https://data.mendeley.com/datasets/5wk5wpzczw/1), Bilal Jan, CC BY 4.0. The full archive is about 8.93 GB. Use **apricot_baseline_images**, not `apricot_augmented_images`.
2. Recommended: open `ml/Berqo_Apricot_Training.ipynb` using Colab → File → Upload notebook. Choose a T4 GPU under Runtime → Change runtime type. The notebook contains the scripts; no repository upload is needed.
3. ZIP only the baseline folder, upload it to Google Drive, set the notebook's `DATA_ZIP` path, then run all cells. Or use its direct official-archive download option if available.
4. Download `apricot-crop-pack.zip`, extract into `ml/outputs/`. It contains `model.onnx`, `metadata.json`, measured `metrics.json`, and held-out demo photos.
5. Run `npm run bundle:model`. This copies the real model and metadata into distributable assets. Run this **before** the final APK build.

CPU fallback, from this directory:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python.exe -m pip install onnx onnxruntime numpy Pillow
.venv/Scripts/python.exe ml/prepare_dataset.py --data "D:/path/to/apricot_baseline_images" --output ml/outputs
.venv/Scripts/python.exe ml/train.py --manifest ml/outputs/manifest.json --output ml/outputs --epochs 10
npm run bundle:model
```

Default classes: healthy appearance, brown rot, shot hole on leaves, shot hole on fruit. Minimum 30 unique originals/class. Use `--classes` to choose supported classes after inspecting the real data; do not invent classes without labels. Training uses ImageNet-pretrained MobileNetV3 Small, frozen-feature training then a short fine-tune. No local LLM or from-scratch training.

### Build and install the Android APK

```powershell
npx eas-cli@latest login
npm run build:android
```

EAS will initialize an isolated Expo project if needed. Download the APK from the build URL onto the Android phone and install it. The preview profile is a **release APK** with bundled JS, not a development client needing Metro. The APK can be sideloaded/shared for the public demo. App-store submission is a separate process.

If the APK was built before training finished, transfer `model.onnx` and `metadata.json` to the phone. In Settings → Install apricot model, choose the ONNX file first and metadata second. Installed files are copied into app storage and survive restart. Rebuild with a bundled crop pack for an offline-first installation on a fresh phone.

## Phone demo

1. While online and at the orchard, tap **Use phone GPS & get forecast**. Allow location while using the app. Verify the phone coordinates and reported accuracy. You can also enter another orchard manually in Settings.
2. View the three-day forecast, six upcoming hourly readings, and weather-based apricot suggestions. Forecasts are cached; refresh while online. Sample weather remains separately marked demonstration data.
3. Turn airplane mode on, close and reopen the standalone APK.
4. Choose a held-out apricot photo (gallery upload is the primary path; camera is optional).
5. Analyze offline. See a possible finding/model score or an uncertain result. No photo leaves the device.
6. Add a note, save a Field Passport, restart the app, and open it from Passports.
7. Queue expert review. It stays queued; no agronomist backend exists. Share JSON/photo manually with a trusted expert if desired.
8. Restore networking and retry the **demo sync** queue. It stores a local receipt only. Never describe this as delivery to an expert/server.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run check:native-link
npx expo-doctor
npx expo export --platform android
```

See `docs/DEVICE_CHECKLIST.md` for physical-device checks. Automated tests cover safety, metadata, advice, localization, weather expiration and sync transitions. JavaScript export/prebuild do not prove native inference works; test the APK on a phone.

## Architecture and future Berqo integration

`src/fieldScout/domain.ts` defines classifier, repository, weather and sync interfaces. `safety.ts`, `risk.ts`, `data/`, `i18n.ts` and `sync.ts` have no Expo/React dependencies. `adapters/` implements Expo file storage, native ONNX, public weather, and isolated demo transport. `ui/` contains screens and state; `src/app/` is a small Expo Router wrapper.

Copy the feature core into private Berqo and supply its persistence, weather and sync adapters. Replace routing/UI/authentication as appropriate. No private Berqo code, credentials, dataset or API is used here. The current store is per-passport JSON plus persistent JPEGs, deliberately behind a repository interface; Berqo can use SQLite or its own data layer later.

## Data and advisory sources

- Vision dataset: [AgriVision-Apricot v1](https://data.mendeley.com/datasets/5wk5wpzczw/1), Jan, Bilal (2026), DOI 10.17632/5wk5wpzczw.1, CC BY 4.0. Retain attribution with distributed models/photos.
- Transfer-learning weights: torchvision [MobileNetV3 Small](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v3_small.html), ImageNet pretraining; see upstream terms and dataset limitations.
- Symptom/advisory context: [UC IPM apricot fruit-development disease guide](https://ipm.ucanr.edu/PMG/C005/m005fpdiseases.html), and [shot hole](https://ipm.ucanr.edu/PMG/r5100311.html). Advice is a conservative observation/expert-review workflow, not pesticide instructions or a validated Armenian treatment plan.
- Forecast: [Open-Meteo](https://open-meteo.com/), CC BY 4.0 data. Its public API is for [non-commercial use](https://open-meteo.com/en/terms). Production Berqo should use the commercial service or another adapter.

## Limits that matter for the demo

- No Armenian orchard accuracy claim is supported until independent local evaluation. Measured test metrics are created only after training.
- High softmax scores do not prove disease or detect every unsupported photo. A blank/overexposed-image gate, confidence threshold and margin reduce some unsafe output; they are not a complete out-of-distribution detector.
- Model input: 224×224 RGB, direct square resize, NCHW float32, ImageNet normalization. Training and mobile follow this contract; verify interpolation differences on a physical phone.
- Float32 export is prioritized for reliability and a small model; no unverified quantization or claimed performance number.
- Weather rules are qualitative inspection reminders (forecast below freezing / forecast rain), not disease prediction or crop-stage-specific frost thresholds. Older-than-24-hour data suppresses alerts. Heat-stress thresholds were omitted rather than invented.
- No production backend, background sync, notifications or agronomist portal. Demo receipt and real review status are explicitly separated.
- Armenian text needs review by a local agronomist. Local app data is sandboxed but not additionally encrypted; uninstalling/clearing data removes records.

See `docs/IMPLEMENTATION.md` for choices, `docs/HACKATHON_DEMO.md` for submission guidance and `ml/README.md` for training detail.

## Technical source and jury materials

Upload `output/pdf/Berqo_Technical_Architecture.pdf` to NotebookLM for the rendered diagrams and selectable technical text. Its maintained source is `docs/TECHNICAL_ARCHITECTURE.md`; `docs/NOTEBOOKLM_VIDEO_PROMPT.md` contains a ready steering prompt. Both Codex and Cursor instructions require updating the source/PDF with relevant project changes. Regenerate using `scripts/export-architecture.py` in a Python environment containing reportlab.

See `docs/JURY_SHARE.md` for the download link, installation guidance and a short demonstration. `dist/Berqo-Jury-Pack.zip` contains the APK, document, source text, prompt, QR, logo and attributed demo photos. No video or source repository is published automatically.
