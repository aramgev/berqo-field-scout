# Physical Android acceptance checks

Run on the standalone preview APK, not Expo Go. Fill in results after actual observation. No item below is claimed verified by code export.

## Version 1.0.5 regression and new features

- [ ] Update over 1.0.4 without uninstalling; old Passports remain accessible.
- [ ] Original Inspect my apricot: upload, analyze offline, save and reopen a new Passport.
- [ ] Guided inspections: add two different-tree sample photos offline; close/reopen and resume with both entries present.
- [ ] Add up to five entries; finished collection counts suspicious/no-obvious-symptom/inconclusive photos separately.
- [ ] Finish early with one or more entries, save a note, reopen; finished records are read-only.
- [ ] Reject a blank photo without adding an entry; remove last tree and replace it.
- [ ] Weather reminder opens a separate collection; fresh matching forecast snapshot/reason is retained and demo weather marked.
- [ ] Readable report preview excludes coordinates until its switch is enabled, both for collection and single-photo Passport.
- [ ] Share text opens the native share menu; cancel without sending.
- [ ] Share photo HTML opens the native share menu; inspect saved HTML for embedded images and no private file paths.
- [ ] Farmer manually sends report to a chosen test recipient; recipient opens attachment in a browser. This requires user action.

## Previous release checks

- [x] Install APK containing real trained crop pack (Galaxy S25, Android 16, v1.0.2, via USB).
- [x] Airplane mode on; close/reopen the standalone app and reopen the saved Passport (user confirmed).
- [ ] Switch English/Armenian, close/reopen, confirm preference persists.
- [x] Choose existing apricot photo and analyze in airplane mode (user confirmed; camera not required).
- [x] Saved record shows model version v0.1.0 and 112 ms processing/inference for one example (native UI observed).
- [x] Save Passport, close/reopen, reopen saved Passport (user confirmed).
- [ ] Test all held-out demo examples and inspect photo/note/model/decision fields individually after restart.
- [ ] Select blank/dark/overexposed photo; receive quality error, no confident result.
- [ ] Check ambiguous apricot photo returns uncertain state if below threshold/margin.
- [ ] Check unrelated-object photos; document any confident mistakes. Never claim reliable unsupported-object detection.
- [ ] Try broken model/incorrect metadata; old pack still works after import failure.
- [ ] No weather cache: home is usable and inspection is available.
- [ ] Online, at orchard: tap Use phone GPS & get forecast, grant foreground location permission; verify fresh phone coordinates, accuracy, timestamp, three-day forecast, hourly rain/humidity and Open-Meteo attribution.
- [ ] Deny GPS permission: actionable message appears; manual coordinates still work.
- [ ] Disable phone Location: actionable message; existing passport/photo functions remain usable.
- [ ] Change coordinates: old forecast disappears until a new forecast is downloaded.
- [ ] Offline GPS: location saves; reconnect and Refresh forecast downloads weather for that location.
- [ ] Verify weather suggestions correspond to next 48 hours: below-zero, rain, or soil-moisture check during a dry period.
- [ ] Airplane mode after refresh: cached forecast remains visible with timestamp.
- [ ] After 24 hours cache is stale and new risk alerts are suppressed.
- [ ] Sample weather is clearly marked demonstration data and does not overwrite real weather cache.
- [ ] Queue review in airplane mode; retry demo sync and confirm failed/waiting status.
- [ ] Reconnect, retry: demo receipt recorded, expert review remains queued.
- [ ] Settings → simulate failure, retry queued record, confirm failed status and later retry success.
- [ ] Share JSON/photo manually; verify JSON contains note/location, no implied remote expert receipt.
- [ ] Restart in airplane mode once more; app and installed model still work.

Evidence to record for judging: phone model, Android version, APK build ID, model bytes/version, offline inference milliseconds, held-out metrics, known wrong predictions, and a screen recording of airplane mode → upload → analyze → save → restart → history.

Basic acceptance confirmed by the user on Galaxy S25 / Android 16, signed build `a032a3fe-fbd4-46cb-a3b2-ee8dc15c0062`. Remaining unchecked items are additional checks, not claimed complete.
