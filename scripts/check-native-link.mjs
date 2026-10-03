import { execFileSync } from 'node:child_process';
import path from 'node:path';
const cli = path.resolve('node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js');
const config = JSON.parse(execFileSync(process.execPath, [cli, 'react-native-config', '--platform', 'android', '--json'], { encoding: 'utf8' }));
const android = config.dependencies['onnxruntime-react-native']?.platforms.android;
if (!android?.packageImportPath?.includes('ai.onnxruntime.reactnative.OnnxruntimePackage')
    || android.packageInstance !== 'new OnnxruntimePackage()') {
  throw new Error('ONNX native package is not registered. Review react-native.config.js before building.');
}
console.log('Verified: Expo registers OnnxruntimePackage for Android.');
