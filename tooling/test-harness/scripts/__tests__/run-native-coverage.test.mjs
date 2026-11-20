import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const harnessDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const runnerLib = path.join(harnessDir, 'scripts/native-coverage-runner.sh');
const runnerScript = path.join(harnessDir, 'scripts/run-native-coverage.sh');

test('native-coverage-runner.sh exposes cleanup and assert helpers', () => {
  const result = spawnSync(
    'bash',
    [
      '-c',
      `source "${runnerLib}"; type cleanup_ios_coverage_artifacts cleanup_android_coverage_artifacts assert_native_coverage`,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /cleanup_ios_coverage_artifacts is a function/);
  assert.match(result.stdout, /cleanup_android_coverage_artifacts is a function/);
  assert.match(result.stdout, /assert_native_coverage is a function/);
});

test('cleanup helpers delete the prior-run coverage directories they name', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-cov-'));
  const derived = path.join(root, 'DerivedData');
  const appBuild = path.join(root, 'app-build');
  const removed = [
    path.join(derived, 'output/coverage'),
    path.join(derived, 'Build/ProfileData'),
    path.join(appBuild, 'outputs/code_coverage'),
    path.join(appBuild, 'reports/jacoco'),
  ];
  const kept = [
    path.join(derived, 'Build/Products'),
    path.join(appBuild, 'outputs/apk'),
  ];
  for (const dir of [...removed, ...kept]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'marker'), 'x');
  }

  const result = spawnSync(
    'bash',
    [
      '-c',
      `source "${runnerLib}"
       cleanup_ios_coverage_artifacts "$DERIVED"
       cleanup_android_coverage_artifacts "$APP_BUILD"`,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, DERIVED: derived, APP_BUILD: appBuild },
    }
  );
  try {
    assert.equal(result.status, 0, result.stderr);
    for (const dir of removed) {
      assert.equal(fs.existsSync(dir), false, `${dir} should be removed`);
    }
    for (const dir of kept) {
      assert.equal(
        fs.existsSync(path.join(dir, 'marker')),
        true,
        `${dir} should stay`
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('run-native-coverage.sh uses the shared cleanup and assert helpers', () => {
  const script = spawnSync('cat', [runnerScript], { encoding: 'utf8' }).stdout;
  assert.match(script, /source "\$HARNESS_DIR\/scripts\/native-coverage-runner\.sh"/);
  assert.match(script, /cleanup_ios_coverage_artifacts "\$derived_data"/);
  assert.match(script, /cleanup_android_coverage_artifacts "\$app_build"/);
  assert.match(script, /assert_native_coverage "\$HARNESS_DIR" "\$PLATFORM"/);
});
