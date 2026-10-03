# Submission and 3-minute demo

The supplied challenge asks for code/prototype and a **2–5 minute video**. Entries without the video do not reach the shortlist. This checklist reflects the challenge brief; it is not permission to publish private data or to claim unmeasured results.

Opening problem statement:

> Because of Berqo Field Scout, an apricot grower can document a suspicious leaf or fruit and decide whether to seek expert help while still in an orchard without internet, instead of delaying that first observation until a connection or extension visit is available.

Evidence: demonstrate this on an actual Android phone with airplane mode enabled. Do not replace that proof with a slide or a mocked classification.

Suggested recording:

1. 0:00–0:25: Explain the farmer’s problem, extension access and weak connectivity. Name Armenian as the local-language interaction.
2. 0:25–0:45: Show orchard weather watch. If using sample weather, say it is sample data. Explain this is a rule-based inspection reminder, not AI disease prediction.
3. 0:45–1:40: Turn on airplane mode. Upload a held-out apricot photo. Show real on-device analysis, score and safe advice. State the model’s supported classes and limits.
4. 1:40–2:10: Save a Field Passport, restart, reopen history. Switch to Armenian.
5. 2:10–2:35: Show an uncertain/poor photo. The app asks for a better photo/expert confirmation. No pesticide recommendation is generated.
6. 2:35–3:00: Explain model bytes, measured held-out metrics, dataset attribution, who makes the final decision and future Berqo adapter integration. State that demo sync does not deliver to an agronomist.

Why AI adds value: the compact vision model extracts learned visual patterns from pixels offline; a static advice page cannot perform that image classification. Weather reminders and passport storage are ordinary software supporting the decision, and should be described as such.

Localizing AI: Armenian text, an apricot-specific task, local orchard context, weak-connectivity use and human review. Acknowledge that dataset geography differs from Armenian orchards and local field validation is still required. A less-supported language would require trusted translations/review; this MVP does not depend on speech recognition or a local LLM.

Before submitting: retain CC BY attribution for dataset/model examples, exclude raw datasets/private paths/secrets, include actual model metrics and phone evidence, provide the APK or build download link, and verify public repository contents.
