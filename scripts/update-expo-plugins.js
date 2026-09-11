#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const appJsonPath = path.resolve(args[args.indexOf('--app-json') + 1]);
const expoVersion = args[args.indexOf('--expo-version') + 1];
// When set, opts the app out of Swift Package Manager resolution through the
// plugin's disableSPM option, exercising the CocoaPods fallback path instead.
const disableSPM = args.includes('--disable-spm');
const expoMajorMatch = expoVersion ? expoVersion.match(/^(\d+)/) : null;
const expoMajor = expoMajorMatch ? parseInt(expoMajorMatch[1], 10) : null;
const needsKotlinVersion = expoMajor !== null && expoMajor <= 52;

const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expoConfig = appConfig.expo ?? (appConfig.expo = {});
expoConfig.plugins = expoConfig.plugins || [];

expoConfig.plugins.push([
  '@stripe/stripe-react-native',
  {
    merchantIdentifier: 'com.stripe.test',
    enableGooglePay: true,
    ...(disableSPM ? { disableSPM: true } : {}),
  },
]);

const buildProperties = {};
if (needsKotlinVersion) {
  buildProperties.android = {
    kotlinVersion: '2.0.21',
  };
}
if (!disableSPM) {
  // Every Expo SDK this script targets ships React Native >= 0.75, so the
  // Stripe iOS SDK resolves through Swift Package Manager by default — which
  // requires dynamic frameworks (Expo's default is static; `pod install`
  // fails fast otherwise). This mirrors what real Expo apps must configure;
  // see stripe_spm.rb. The fallback (--disable-spm) run deliberately keeps
  // Expo's static default: that is the configuration opted-out apps build
  // with.
  buildProperties.ios = {
    useFrameworks: 'dynamic',
  };
}
if (Object.keys(buildProperties).length > 0) {
  expoConfig.plugins.push(['expo-build-properties', buildProperties]);
}

expoConfig.android = expoConfig.android ?? {};
expoConfig.android.package = 'com.stripe.expotestapp';

expoConfig.ios = expoConfig.ios ?? {};
expoConfig.ios.bundleIdentifier = 'com.stripe.expotestapp';

fs.writeFileSync(appJsonPath, `${JSON.stringify(appConfig, null, 2)}\n`);
