import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { checkFamilies, familyIndex } from '../checks/bridge-check.mjs';
import {
  findPackage,
  loadConfig,
  repoRoot,
  unlistedPackages,
} from '../checks/config.mjs';
import { configureAppJson, smokeSettings } from '../checks/expo-smoke.mjs';

function bridgeCheckModule() {
  return import(
    pathToFileURL(
      path.join(repoRoot, 'packages/bridge-contracts/scripts/check.mjs')
    ).href
  );
}

test('the gate config lists every package under packages/', () => {
  assert.deepEqual(unlistedPackages(loadConfig()), []);
});

test('unlistedPackages returns a package absent from the config', () => {
  const packagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-packages-'));
  try {
    fs.mkdirSync(path.join(packagesDir, 'known'));
    fs.writeFileSync(
      path.join(packagesDir, 'known', 'package.json'),
      JSON.stringify({ name: '@stripe/react-native-known' })
    );
    fs.mkdirSync(path.join(packagesDir, 'ignored'));
    fs.writeFileSync(
      path.join(packagesDir, 'ignored', 'package.json'),
      JSON.stringify({ name: '@stripe/react-native-ignored' })
    );
    fs.mkdirSync(path.join(packagesDir, 'extra'));
    fs.writeFileSync(
      path.join(packagesDir, 'extra', 'package.json'),
      JSON.stringify({ name: '@stripe/react-native-extra' })
    );
    assert.deepEqual(
      unlistedPackages(
        {
          packages: [{ name: '@stripe/react-native-known' }],
          notGated: { '@stripe/react-native-ignored': 'fixture' },
        },
        packagesDir
      ),
      ['@stripe/react-native-extra']
    );
  } finally {
    fs.rmSync(packagesDir, { recursive: true, force: true });
  }
});

test('loadConfig rejects a bad status and a missing dir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-config-'));
  const file = path.join(dir, 'packages.json');
  try {
    fs.writeFileSync(
      file,
      JSON.stringify({
        packages: { '@x/y': { status: 'nope', dir: 'packages/y' } },
      })
    );
    assert.throws(
      () => loadConfig(file),
      /@x\/y: "status" must be one of shell, ready/
    );
    fs.writeFileSync(
      file,
      JSON.stringify({ packages: { '@x/y': { status: 'ready' } } })
    );
    assert.throws(() => loadConfig(file), /@x\/y: "dir" is required/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig carries per-package expoSdk overrides', () => {
  const { packages } = loadConfig();
  const monolith = packages.find(
    (pkg) => pkg.name === '@stripe/stripe-react-native'
  );
  assert.equal(monolith?.expoSdk, 55);
});

test('packages resolve by name, alias, and directory', () => {
  const { packages } = loadConfig();
  assert.equal(findPackage(packages, 'payments').dir, 'packages/payments');
  assert.equal(
    findPackage(packages, '@stripe/react-native-core').alias,
    'core'
  );
  assert.equal(
    findPackage(packages, '.', path.join(repoRoot, 'packages/onramp')).alias,
    'onramp'
  );
  assert.equal(
    findPackage(packages, '.', repoRoot).alias,
    'stripe-react-native'
  );
  assert.equal(findPackage(packages, 'nope'), null);
});

test('bridge families need a fixture for every entry and nothing pending', () => {
  const inventory = {
    'StripeSdk.a': { family: 'f1' },
    'StripeSdk.a#result': { family: 'f1' },
    'StripeSdk.b': { family: 'f2', pending: 'native runner missing' },
  };
  const fixtures = [
    { family: 'f1', method: 'StripeSdk.a', keys: ['result.error.code'] },
  ];
  assert.deepEqual(
    checkFamilies({ inventory, fixtures, families: ['f1'] }).errors,
    []
  );
  assert.deepEqual(
    checkFamilies({ inventory, fixtures, families: '*' }).errors,
    ['StripeSdk.b is still pending: native runner missing']
  );
  assert.deepEqual(
    checkFamilies({ inventory, fixtures: [], families: ['f1', 'f3'] }).errors,
    [
      'family "f3" is not used in inventory.json',
      'StripeSdk.a has no fixture',
      'StripeSdk.a#result has no fixture',
    ]
  );
});

test('the smoke app follows the Expo SDK profile and drops web.output', () => {
  const config = {
    expoSdk: 55,
    appName: 'StripeSmoke',
    applicationId: 'com.example.smoke',
    webOutput: 'remove',
    sdkProfiles: { 55: { iosDeploymentTarget: '16.0', androidMinSdk: 24 } },
  };
  assert.throws(
    () => smokeSettings(config, '99'),
    /no sdkProfiles entry for Expo SDK 99/
  );
  const settings = smokeSettings(config);
  const { appJson, templateWebOutput } = configureAppJson(
    {
      expo: {
        web: { output: 'server', favicon: './f.png' },
        plugins: ['expo-router'],
      },
    },
    settings,
    ['@stripe/stripe-react-native', { enableGooglePay: true }]
  );
  assert.equal(templateWebOutput, 'server');
  assert.deepEqual(appJson.expo.web, { favicon: './f.png' });
  assert.deepEqual(appJson.expo.plugins, [
    'expo-router',
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'dynamic', deploymentTarget: '16.0' },
        android: { minSdkVersion: 24 },
      },
    ],
    ['@stripe/stripe-react-native', { enableGooglePay: true }],
  ]);
  const kept = configureAppJson(
    { expo: {} },
    { ...settings, webOutput: 'server' },
    null
  );
  assert.equal(kept.appJson.expo.web.output, 'server');
});

test('familyIndex lists expect keys from a fixture directory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-bridge-'));
  const fixtures = path.join(root, 'packages/bridge-contracts/fixtures');
  try {
    fs.mkdirSync(path.join(fixtures, 'payments'), { recursive: true });
    fs.writeFileSync(path.join(fixtures, 'README'), 'not a family directory');
    fs.writeFileSync(
      path.join(fixtures, 'payments', 'note.txt'),
      'not a fixture'
    );
    fs.writeFileSync(
      path.join(root, 'packages/bridge-contracts/inventory.json'),
      JSON.stringify({ 'StripeSdk.confirm': { family: 'payments' } })
    );
    fs.writeFileSync(
      path.join(fixtures, 'payments', 'confirm.basic.json'),
      JSON.stringify({
        method: 'StripeSdk.confirm',
        expect: {
          shared: { 'result.error.code': 'Failed' },
          ios: { 'result.payment': 'id' },
          android: {},
        },
      })
    );
    const { loadParsedFixtures } = await bridgeCheckModule();
    assert.deepEqual(familyIndex(loadParsedFixtures(root)), {
      inventory: { 'StripeSdk.confirm': { family: 'payments' } },
      fixtures: [
        {
          family: 'payments',
          method: 'StripeSdk.confirm',
          keys: ['result.error.code', 'result.payment'],
        },
      ],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('invalid JSON and an invalid fixture fail the bridge check', async () => {
  const { loadParsedFixtures, runBridgeFixtureChecks } =
    await bridgeCheckModule();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-check-'));
  const familyDir = path.join(
    root,
    'packages/bridge-contracts/fixtures/payment-sheet'
  );
  fs.mkdirSync(familyDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'packages/bridge-contracts/inventory.json'),
    '{}\n'
  );
  fs.writeFileSync(path.join(familyDir, 'broken.json'), '{');
  fs.writeFileSync(
    path.join(familyDir, 'initPaymentSheet.bad.json'),
    JSON.stringify({ method: 1 })
  );
  const parsed = loadParsedFixtures(root);
  const errors = [];
  const log = console.log;
  const error = console.error;
  console.log = () => {};
  console.error = (line) => errors.push(line);
  try {
    const status = runBridgeFixtureChecks(parsed);
    assert.equal(status, 1);
    const text = errors.join('\n');
    assert.match(text, /broken\.json: invalid JSON:/);
    assert.match(
      text,
      /initPaymentSheet\.bad\.json: "method" must be a string/
    );
  } finally {
    console.log = log;
    console.error = error;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a family list checks that family and skips a broken fixture outside it', async () => {
  const { loadParsedFixtures, runBridgeFixtureChecks } =
    await bridgeCheckModule();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-bridge-families-'));
  const bridge = path.join(root, 'packages/bridge-contracts');
  const fixtures = path.join(bridge, 'fixtures');
  const coreDir = path.join(fixtures, 'core');
  const otherDir = path.join(fixtures, 'payments');
  fs.mkdirSync(coreDir, { recursive: true });
  fs.mkdirSync(otherDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'packages/bridge-contracts/inventory.json'),
    path.join(bridge, 'inventory.json')
  );
  fs.cpSync(
    path.join(repoRoot, 'packages/bridge-contracts/fixtures/core'),
    coreDir,
    { recursive: true }
  );
  fs.writeFileSync(path.join(otherDir, 'broken.json'), '{');
  const parsed = loadParsedFixtures(root);
  const repoFixtures = path.join(
    repoRoot,
    'packages/bridge-contracts/fixtures'
  );
  const tempFixtures = path.join(fixtures);
  parsed.fixtures = parsed.fixtures.map((item) => {
    if (item.family !== 'core') return item;
    const relative = path.relative(tempFixtures, item.file);
    return { ...item, file: path.join(repoFixtures, relative) };
  });
  const badFamily = 'payments';
  const errors = [];
  const log = console.log;
  const error = console.error;
  console.log = () => {};
  console.error = (line) => errors.push(String(line));
  try {
    assert.equal(
      runBridgeFixtureChecks(parsed, { families: ['core'] }),
      0,
      errors.join('\n')
    );
    assert.equal(
      errors.some((line) => line.includes('broken.json')),
      false
    );
    errors.length = 0;
    assert.equal(
      runBridgeFixtureChecks(parsed, { families: [badFamily] }),
      1
    );
    assert.equal(
      errors.some((line) => line.includes('broken.json')),
      true
    );
  } finally {
    console.log = log;
    console.error = error;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
