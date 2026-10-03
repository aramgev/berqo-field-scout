// ORT 1.24.3's obsolete unimodule marker hides it from Expo's inferred RN autolinking.
// Explicit configuration registers its real ReactPackage without editing generated native code.
module.exports = {
  dependencies: {
    'onnxruntime-react-native': {
      platforms: {
        android: {
          sourceDir: './android',
          packageImportPath: 'import ai.onnxruntime.reactnative.OnnxruntimePackage;',
          packageInstance: 'new OnnxruntimePackage()',
        },
      },
    },
  },
};
