import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  checkSpi,
  compareWithAllowlist,
  findSpiSites,
  isTestPath,
} from '../checks/spi-check.mjs';

const FORBIDDEN = ['InternalOnlyAPI', 'DashboardOnly'];

function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spi-check-'));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

test('test paths are exempt', () => {
  assert.ok(isTestPath('ios/Tests/BridgeRunners.swift'));
  assert.ok(isTestPath('packages/payments/ios/Tests/Foo.swift'));
  assert.ok(isTestPath('packages/payments/ios/__tests__/Foo.swift'));
  assert.ok(!isTestPath('packages/payments/ios/MappersTests.swift'));
  assert.ok(!isTestPath('ios/PaymentProbeTest.swift'));
  assert.ok(!isTestPath('ios/StripeSdkImpl.swift'));
  assert.ok(!isTestPath('ios/Testing/Thing.swift'));
});

test('finds forbidden SPI attributes in non-test sources only', () => {
  const root = fixtureRepo({
    'ios/A.swift':
      '@_spi(ReactNativeSDK) @_spi(InternalOnlyAPI) import StripePaymentSheet\n',
    'ios/B.m': '// nothing here\n',
    'ios/C.swift': '@_spi(DashboardOnly) @_spi(STP) import Stripe\n',
    'ios/D.swift': '@_spi(ReactNativeSDK) import StripeCore\n',
    'ios/Tests/E.swift': '@_spi(InternalOnlyAPI) import StripeCore\n',
    'ios/GTests.swift': '@_spi(InternalOnlyAPI) import StripeCore\n',
    'ios/build/F.swift': '@_spi(InternalOnlyAPI) import StripeCore\n',
  });
  const sites = findSpiSites({
    repoRoot: root,
    roots: ['ios'],
    forbidden: FORBIDDEN,
  });
  assert.deepEqual(
    sites.map(({ file, lineNumber, spis }) => ({ file, lineNumber, spis })),
    [
      { file: 'ios/A.swift', lineNumber: 1, spis: ['InternalOnlyAPI'] },
      { file: 'ios/C.swift', lineNumber: 1, spis: ['DashboardOnly'] },
      { file: 'ios/GTests.swift', lineNumber: 1, spis: ['InternalOnlyAPI'] },
    ]
  );
});

test('a new site fails and a removed site leaves a stale entry', () => {
  const sites = [
    { file: 'ios/A.swift', line: '@_spi(InternalOnlyAPI) import StripeCore' },
    { file: 'ios/New.swift', line: '@_spi(InternalOnlyAPI) import StripeCore' },
  ];
  const allowlist = [
    { file: 'ios/A.swift', line: '@_spi(InternalOnlyAPI) import StripeCore' },
    {
      file: 'ios/Gone.swift',
      line: '@_spi(InternalOnlyAPI) import StripeCore',
    },
    {
      file: 'packages/payments/ios/P.swift',
      line: '@_spi(InternalOnlyAPI) import StripeCore',
    },
  ];
  const result = compareWithAllowlist({ sites, allowlist, roots: ['ios'] });
  assert.deepEqual(
    result.allowed.map((s) => s.file),
    ['ios/A.swift']
  );
  assert.deepEqual(
    result.violations.map((s) => s.file),
    ['ios/New.swift']
  );
  assert.deepEqual(
    result.stale.map((s) => s.file),
    ['ios/Gone.swift']
  );
});

test('each allowlist entry admits one matching line', () => {
  const line = '@_spi(InternalOnlyAPI) import StripeCore';
  const result = compareWithAllowlist({
    sites: [
      { file: 'ios/A.swift', line },
      { file: 'ios/A.swift', line },
    ],
    allowlist: [{ file: 'ios/A.swift', line }],
    roots: ['ios'],
  });
  assert.deepEqual(result.violations, [{ file: 'ios/A.swift', line }]);
  assert.equal(result.allowed.length, 1);
});

test('checkSpi reads the allowlist file', () => {
  const root = fixtureRepo({
    'ios/A.swift': '@_spi(InternalOnlyAPI) import StripeCore\n',
    'allowlist.json': JSON.stringify({
      forbidden: FORBIDDEN,
      sites: [
        {
          file: 'ios/A.swift',
          line: '@_spi(InternalOnlyAPI) import StripeCore',
        },
      ],
    }),
  });
  const result = checkSpi({
    repoRoot: root,
    roots: ['ios'],
    allowlistFile: path.join(root, 'allowlist.json'),
  });
  assert.equal(result.allowed.length, 1);
  assert.equal(result.violations.length + result.stale.length, 0);
});
