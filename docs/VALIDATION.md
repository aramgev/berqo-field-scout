# Delivery validation

## Version 1.0.5 guided inspection update

- Standalone collection records in inspections.json; original single-photo Passport schema and analyze/save workflow retained.
- Weather-to-collection entry snapshots context; readable text and HTML photo reports omit coordinates by default.
- Typecheck, lint, native ONNX autolinking and 20 application tests passed, including five new inspection/report safety tests.
- EAS build 3fc87a87-21ef-424a-b67f-ba18b506b560 FINISHED, version 1.0.5 / versionCode 6. APK 75,202,189 bytes; signature v2, exact model/metadata assets, standalone bundle and ARM64 alignment checks passed.
- APK SHA-256: 1019e7b26f28a75f342928ba28637b465b9454f990d0d01edacddd763c6ada5c.
- USB installation timed out while a Play Protect dialog was open; package inspection still shows 1.0.4. New APK copied to Downloads/Berqo-1.0.5.apk for user installation. New collection/report physical acceptance is pending. Browser preview of a generated HTML report was visually checked with an embedded demo photo.

Signed Android release build: `a032a3fe-fbd4-46cb-a3b2-ee8dc15c0062`, version 1.0.2, completed 2026-10-03 21:40 UTC (2026-10-04 in Armenia).

- EAS result: FINISHED, preview APK, Android package `com.berqo.fieldscout`.
- APK: 74,384,004 bytes. SHA-256: `3e1e15a8b2910e9115a2a7b11d88a1c58c7c46b1ed770c91cd192c6e90188daa`.
- ZIP integrity and exact bundled trained model/metadata hashes verified using `scripts/verify-apk.py`; standalone JS and ARM64 ONNX libraries are present.
- Google's official `apksigner` verifies the APK signature (v2). Preview targets arm64-v8a. All ARM64 ELF LOAD segments and uncompressed ZIP library offsets pass 16 KB alignment checks; this does not replace runtime validation on an actual 16 KB device.
- Expo's actual Android autolinking output registers `OnnxruntimePackage`; `npm run check:native-link` checks this reproducibly.
- TypeScript check and ESLint pass. All 11 application tests pass. Two Python dataset-pipeline tests pass.
- Expo Doctor passed all 21 checks. Android Metro export included model assets. Cloud native compile and release signing succeeded after the isolated Gradle compatibility plugin was applied.
- Browser phone viewport: English/Armenian home layout, photo upload, note, saved passport and persistence after refresh checked. Browser does not run native inference.
- Model: 6,098,545 bytes, MobileNetV3 Small, float32 ONNX, four apricot classes. Held-out test: 78 images, accuracy 85.90%, macro-F1 87.43%. ONNX versus PyTorch maximum output difference: approximately 0.0000162.
- Physical phone: Galaxy S25 (SM-S931B), Android 16, 4 KB pages. Version 1.0.2 (versionCode 3) installed successfully using ADB. App opens and its scoped startup logs show no JavaScript or Android runtime crash. The initial universal APK's missing ONNX registration was reproduced on the phone and fixed with explicit RN autolinking.
- User confirmed: model ready, photo analysis in airplane mode, Passport saving, and reopening the saved Passport after closing/reopening the app. Read-only native UI inspection also showed the offline status and a saved record with model v0.1.0 and elapsed processing/inference time of 112 ms. This is one sample, not a latency distribution or an accuracy validation. Broader checks remain unchecked in `DEVICE_CHECKLIST.md`.

The model evaluation is a random image split of AgriVision-Apricot, with exact/identical difference-hash duplicates excluded. It is not independent Armenian orchard validation. Demo sync stores a local receipt and does not send an observation to a real expert or server.

## GPS / weather update validation (1.0.3)

- TypeScript and ESLint pass; all 15 application tests pass, including forecast dates, malformed data rejection, dry/rain advice and coordinate/cache matching.
- Actual Open-Meteo request for the public default Armavir coordinates returned 72 hourly values and three daily forecasts in Asia/Yerevan. The application parser accepted it and selected the dry-period soil-moisture suggestion for the next 48 hours.
- Only one new native dependency, SDK-compatible expo-location, was installed through expo install. Foreground location only; no background tracking.
- Physical GPS permission, position accuracy and weather download must be checked on the updated APK; previous offline acceptance applies to 1.0.2 until repeated.

- GPS/weather APK: EAS build `199ce202-8ea7-4cea-a22d-47b55b07bdbe`, FINISHED, version 1.0.3 / versionCode 4; 74,950,258 bytes, SHA-256 `07e9f672d458dd006c3f1f8c585e7b9ae9c7371e2b3654f75f022263f9c40333`. Signature v2, exact bundled model/metadata and ARM64 ELF/ZIP alignment verified. Manifest includes coarse/fine location, no background location permission. Expo Doctor passes all 21 checks.

- Version 1.0.3 installed successfully over 1.0.2 using ADB on the same Galaxy S25, retaining app data; Android package reports versionCode 4. App launch succeeded. GPS/forecast/cached-forecast user check is pending.

- Read-only UI inspection of the running 1.0.3 app confirmed Phone location with reported accuracy ±33 m and Last refreshed 2026-10-04 02:30:20 in Asia/Yerevan, plus the next-48-hour forecast section. Exact personal coordinates were not copied into this report. No visible error. Three-day cards/suggestions below the visible scroll area and offline reopening are awaiting user confirmation. App-scoped startup log contains Running main with no JS/Android runtime error.

## Berqo branding and technical delivery (1.0.4)

- The provided PNG is copied unchanged to assets/berqo-logo.png and used for the launcher, Android adaptive foreground, web favicon and app header. App display name is Berqo. Package/signing identity is retained for upgrades.
- EAS build c4cdb281-19e6-44fe-bc21-a0f311e43ea1 finished successfully. APK version 1.0.4 / versionCode 5, 75,177,401 bytes, SHA-256 f7a4ca67c70a29d393dd145044fa0fb258a9c3188da517e8664d48fbaae1edfc. Android manifest label is Berqo. Signature v2, exact bundled model/metadata, standalone JS and ARM64 native alignment verified.
- Lint and type checking passed for the branding change. No inference, weather or persistence behavior changed.
- Architecture PDF exported with ten pages, four vector diagrams, selectable text and valid source links; all page renders visually reviewed. NotebookLM prompt, Codex/Cursor maintenance rules and jury guide are included.

- Berqo 1.0.4 installed successfully over 1.0.3 on the Galaxy S25. Native app process starts and scoped logs show Running main with no JS/Android runtime error. The source logo is byte-for-byte identical to the supplied file.


## Working source design update (5 October 2026, unbuilt)

- TypeScript, Expo ESLint and all 23 application tests pass. New tests cover uncertainty/unavailable title and care routing, bilingual source-backed plans, saved single-check weather, and coordinates excluded from readable reports by default.
- No package/dependency, model, confidence gate or inference-input change. Locked dependencies restored with npm ci for local checks.
- Actual Expo web home and capture flow inspected at 390 x 844. Labeled local-only fixtures using the actual screens/components inspected result, five-tree summary, missing AI, missing weather, English/Armenian copy and expandable details; Armenian uncertainty checked at 320 x 780. Fixture data is not an inference result or real orchard observation.
- Architecture PDF and SVG diagrams regenerated. Thirteen PDF pages rendered with Poppler and visually reviewed.
- New APK build, physical Android regression, native sharing, accessibility-reader testing, large system-font testing and local agronomist review of translated care remain pending. Existing APK/jury ZIP links still refer to the prior release. Replace NotebookLM snapshots after refreshing the deliverables.
