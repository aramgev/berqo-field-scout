// ONNX RN 1.24.3 uses a removed Gradle version helper. Keep this isolated until upstream fixes it.
const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
module.exports = function withOnnxGradleCompat(config) {
  config = withGradleProperties(config, mod => {
    const abis = process.env.BERQO_ANDROID_ABIS;
    if (abis) {
      if (!/^(arm64-v8a|armeabi-v7a|x86|x86_64)(,(arm64-v8a|armeabi-v7a|x86|x86_64))*$/.test(abis)) throw new Error('Invalid BERQO_ANDROID_ABIS');
      mod.modResults = mod.modResults.filter(item => item.key !== 'reactNativeArchitectures');
      mod.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: abis });
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const file = path.join(mod.modRequest.projectRoot, 'node_modules/onnxruntime-react-native/android/build.gradle');
    const original = fs.readFileSync(file, 'utf8');
    const obsolete = 'VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71")';
    let patched = original;
    if (original.includes(obsolete)) patched = original.replace(obsolete, 'REACT_NATIVE_MINOR_VERSION < 71');
    else if (!original.includes('REACT_NATIVE_MINOR_VERSION < 71')) throw new Error('ONNX Gradle compatibility patch needs review for the installed version.');
    // Upstream also resolves a nightly native AAR dynamically; use the matching official stable release.
    patched = patched.replace('onnxruntime-android:latest.integration@aar', 'onnxruntime-android:1.24.3@aar');
    if (patched !== original) fs.writeFileSync(file, patched);
    // RN uses NDK r27. ONNX's separate CMake target needs the official 16 KB linker flags explicitly.
    const cmakeFile = path.join(path.dirname(file), 'CMakeLists.txt');
    const cmake = fs.readFileSync(cmakeFile, 'utf8');
    if (!cmake.includes('max-page-size=16384')) {
      if (!cmake.includes('onnxruntimejsi SHARED')) throw new Error('ONNX CMake target changed; review alignment patch');
      fs.writeFileSync(cmakeFile, cmake + '\n# Berqo: Android 16 KB page compatibility, also valid on 4 KB devices.\ntarget_link_options(onnxruntimejsi PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")\n');
    }
    return mod;
  }]);
};
