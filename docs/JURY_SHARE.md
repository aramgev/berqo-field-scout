# Share Berqo with the jury

Working source update, 5 October 2026: the redesigned Check one tree / Walk the orchard experience, automatic saved-weather context and curated care steps are not yet included in the APK or jury ZIP linked below. The link remains the latest built 1.0.5 release. Replace the APK, jury pack and NotebookLM snapshots after packaging and phone verification.

Release: Berqo 1.0.5, Android versionCode 6, ARM64 preview APK, about 75 MB. No Expo Go, developer account, model download, additional training, or AI API key is needed to run it.

## Fastest route

Send the jury this APK download link:

https://expo.dev/artifacts/eas/BA65leTci40sa9Q-SrVxiU1ST83Z59dsEpoQ9LSdURA.apk

Build record: https://expo.dev/accounts/aram_am/projects/berqo-field-scout/builds/3fc87a87-21ef-424a-b67f-ba18b506b560

The APK is directly downloadable without an Expo sign-in. It is a standalone Android app. Expo Go's project QR code is not the distribution route for native offline ONNX inference. A download QR image is included in the jury pack; it opens the APK URL.

The jury should download and open the APK on a compatible ARM64 Android phone. Android may ask to allow installation for the app opening the file, such as a browser or Files. Follow the phone's installation and app-verification prompts. If installation fails, retain the exact error and phone model/version for diagnosis. Do not describe all Android phones as tested: validation used a Galaxy S25 running Android 16. iOS delivery is not included.

If an earlier Berqo version is installed, install the update over it; it uses the same signing key and package. Uninstalling or clearing app data removes the user's local Passports.

## Files to submit or share

Inside the archive, open START_HERE.md and install Berqo-1.0.5.apk. The technical PDF and video prompt are at its top level.

dist/Berqo-Jury-Pack.zip is a ready-to-share archive containing the signed Berqo APK, technical architecture PDF, Markdown architecture source, NotebookLM video prompt, download QR, original logo, demo-photo guide and licensed sample photos. Upload it to your hackathon's submission portal or a shared folder you control, then supply a working download link. A shared ZIP is convenient for all materials; the direct APK link is faster for installation. Preserve the local pack in case hosted build artifacts expire. Current EAS metadata lists expiry as 18 October 2026 at 03:55 Armenia time; share the local APK through your own file hosting if the jury needs later access.

For a complete submission, add your own real screen-recorded demo and source repository/archive if requested by the challenge. No jury email or message is sent automatically. No source repository has been published by this task. No generated technical video is included yet; the NotebookLM prompt is ready for you to use.

## Three-minute phone demonstration

1. Open Berqo. The apricot model is bundled.
2. While online, use phone GPS at the orchard and get the forecast. If you are demonstrating somewhere else, label that location correctly or enter orchard coordinates manually. View the forecast and suggestions. Sample weather must stay visibly labeled as demonstration data.
3. Turn on airplane mode. Choose brown_rot.jpg or shot_hole_leaves.jpg from the supplied demo photos, then Analyze offline. These were selected to illustrate the workflow; they are not an unbiased evaluation sample. Model scores may differ slightly on the phone.
4. Explain the possible finding, uncertainty policy and expert-confirmation guidance. Try uncertain_apricot.jpg or blank_photo.jpg to show the fallback/quality gate.
5. Add a note and save a Field Passport. Close and reopen Berqo; reopen the record from Passports.
6. Reconnect if needed. Show manual Passport/photo sharing. Explain that the expert-review sync queue is a local demonstration and does not send to a real agronomist backend.

Version 1.0.5 adds a separate Guided inspections button. Start there or from a weather reminder, choose different trees, upload and analyze one photo per tree, then Finish after one to five samples. Reopen it from Guided inspections after restarting. Counts refer to photos, not confirmed disease prevalence. Show Share text summary or Share readable report with photos; the latter is a browser-readable HTML attachment with embedded thumbnails. Coordinates are off by default for these readable reports. Do not send to a real recipient during a jury demo unless intended. The original Inspect my apricot flow remains independent.

## Short message you can copy

Berqo is our Android apricot field-inspection MVP. Download the standalone APK at the link above; no Expo account or model setup is required. It classifies apricot photos locally, stores Field Passports, and provides a GPS-based forecast with inspection suggestions. The attached technical architecture explains the measured model results and limitations. Please use a compatible ARM64 Android phone. We can also demonstrate it on our Galaxy S25. Expert sync is currently a local demo; manual sharing is supported.

## References

Expo internal-distribution behavior: https://docs.expo.dev/build/internal-distribution/

Sample-photo attribution and selection details: demo/README.md and demo/examples.json. AgriVision-Apricot, Bilal Jan, version 1, CC BY 4.0: https://data.mendeley.com/datasets/5wk5wpzczw/1
