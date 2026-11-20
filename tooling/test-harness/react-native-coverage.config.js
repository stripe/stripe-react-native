const path = require('path');
const { repoRoot } = require('./coverage-scope');

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const coverageDir = path.join(repoRoot, 'coverage');

module.exports = {
  nativeModuleName: 'Coverage',
  app: {
    androidApplicationId: 'com.stripe.react.native.testharness',
    iosBundleId: 'com.stripe.react.native.testharness',
    iosProductName: 'ReactTestApp',
  },
  ios: {
    frameworkNamePrefixes: ['stripe_react_native'],
  },
  android: {
    libraryProjectMatchers: ['stripe-react-native'],
    coverageRelativePath: 'files/coverage.ec',
    jacocoReportXml: path.join(coverageDir, 'android/jacocoTestReport.xml'),
  },
  // LCOV SF: paths become repository-relative (ios/StripeSdkImpl.swift).
  sourcePathRewrite: [
    { kind: 'regex', pattern: `^${escape(repoRoot)}/`, replacement: '' },
  ],
  strict: true,
  assert: {
    // An SF: path must contain one of these and have lines hit. Each entry
    // names SDK code, so harness-only hits (react-native-test-app) never pass.
    lcovPathIncludes: ['ios/StripeSdk', 'src/functions.ts', 'packages/'],
    jacocoPackageIncludes: ['com/reactnativestripesdk'],
    defaultLcovPath: path.join(coverageDir, 'ios/lcov.info'),
    defaultJacocoXmlPath: path.join(
      coverageDir,
      'android/jacocoTestReport.xml'
    ),
  },
};
