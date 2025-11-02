#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const appJsonPath = path.resolve(args[args.indexOf('--app-json') + 1]);
const expoVersion = args[args.indexOf('--expo-version') + 1];
const expoMajorMatch = expoVersion ? expoVersion.match(/^(\d+)/) : null;
const expoMajor = expoMajorMatch ? parseInt(expoMajorMatch[1], 10) : null;
const needsBuildProperties = expoMajor !== null && expoMajor <= 52;

const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const plugins = appConfig.expo.plugins;

plugins.push([
  '@stripe/stripe-react-native',
  {
    merchantIdentifier: 'com.stripe.test',
    enableGooglePay: true,
  },
]);

if (needsBuildProperties) {
  plugins.push([
    'expo-build-properties',
    {
      android: {
        kotlinVersion: '2.0.21',
      },
    },
  ]);
}

fs.writeFileSync(appJsonPath, `${JSON.stringify(appConfig, null, 2)}\n`);
