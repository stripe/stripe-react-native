import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { repoRoot } from '../checks/config.mjs';
import { parseArgs } from '../checks/gate-args.mjs';
import {
  emptyBridgeFamiliesRecord,
  gateVerdict,
  runBridgeTierCommand,
  shouldBuildPackages,
  skippedSteps,
} from '../gate.mjs';

const shell = {
  name: '@stripe/react-native-core',
  alias: 'core',
  status: 'shell',
  dir: 'packages/core',
};
const ready = {
  name: '@stripe/stripe-react-native',
  alias: 'stripe-react-native',
  status: 'ready',
  dir: '.',
};

test('a shell package stays SHELL when no step fails', () => {
  const { lines, exitCode } = gateVerdict({
    results: [{ pkg: 'core', step: 'spi', status: 'PASS', detail: '' }],
    selected: [shell],
    missing: [],
    skipped: [],
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(lines, [
    'RESULT @stripe/react-native-core: SHELL (not gate-ready; this run cannot close a package)',
  ]);
});

test('a strict --platforms subset is listed in skippedSteps', () => {
  const skipped = skippedSteps(parseArgs(['--all', '--platforms=ios']));
  assert.ok(skipped.includes('expo on android'));
});

test('CI --skip=expo --bridge=js is PARTIAL and exits 0 when steps pass', () => {
  const args = parseArgs(['--all', '--skip=expo', '--bridge=js']);
  const { lines, exitCode } = gateVerdict({
    results: [
      { pkg: 'stripe-react-native', step: 'spi', status: 'PASS', detail: '' },
    ],
    selected: [ready],
    missing: [],
    skipped: skippedSteps(args),
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(lines, [
    'RESULT @stripe/stripe-react-native: PARTIAL (skipped: expo, bridge on ios, android)',
  ]);
});

test('a config failure fails the run and every selected package', () => {
  const missing = {
    name: '@stripe/react-native-missing',
    alias: 'missing',
    status: 'ready',
    dir: 'packages/missing',
  };
  const { lines, exitCode } = gateVerdict({
    results: [
      {
        pkg: '(config)',
        step: 'config',
        status: 'FAIL',
        detail: 'unlisted: @stripe/react-native-extra',
      },
    ],
    selected: [shell, missing],
    missing: [missing],
    skipped: [],
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(lines, [
    'RESULT gate config: FAIL (see "gate config" above)',
    'RESULT @stripe/react-native-core: FAIL',
    'RESULT @stripe/react-native-missing: FAIL (configured directory packages/missing has no package.json)',
  ]);
});

test('a package-scoped step failure fails a ready package', () => {
  const { lines, exitCode } = gateVerdict({
    results: [
      {
        pkg: 'stripe-react-native',
        step: 'pack',
        status: 'FAIL',
        detail: 'missing file',
      },
    ],
    selected: [ready],
    missing: [],
    skipped: [],
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(lines, ['RESULT @stripe/stripe-react-native: FAIL']);
});

test('a package-scoped step failure fails a shell package', () => {
  const { lines, exitCode } = gateVerdict({
    results: [
      { pkg: 'core', step: 'pack', status: 'FAIL', detail: 'missing file' },
    ],
    selected: [shell],
    missing: [],
    skipped: [],
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(lines, ['RESULT @stripe/react-native-core: FAIL']);
});

test('a shared step failure fails ready packages and leaves a clean shell as SHELL', () => {
  const { lines, exitCode } = gateVerdict({
    results: [
      { pkg: '(all)', step: 'coverage', status: 'FAIL', detail: 'floors' },
    ],
    selected: [shell, ready],
    missing: [],
    skipped: [],
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(lines, [
    'RESULT @stripe/react-native-core: SHELL (not gate-ready; this run cannot close a package)',
    'RESULT @stripe/stripe-react-native: FAIL',
  ]);
});

test('a ready package with every step passing is PASS', () => {
  const { lines, exitCode } = gateVerdict({
    results: [
      { pkg: 'stripe-react-native', step: 'spi', status: 'PASS', detail: '' },
    ],
    selected: [ready],
    missing: [],
    skipped: [],
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(lines, ['RESULT @stripe/stripe-react-native: PASS']);
});

test('GATE_SKIP_BUILD skips the nx build preamble and local runs keep it', () => {
  const readyPack = { ready: true, packOrExpo: true };
  assert.equal(shouldBuildPackages({}, readyPack), true);
  assert.equal(shouldBuildPackages({ GATE_SKIP_BUILD: '1' }, readyPack), false);
  assert.equal(
    shouldBuildPackages({ NX_TASK_TARGET_PROJECT: 'pkg:gate' }, readyPack),
    false
  );
  assert.equal(
    shouldBuildPackages({}, { ready: false, packOrExpo: true }),
    false
  );
  assert.equal(
    shouldBuildPackages({}, { ready: true, packOrExpo: false }),
    false
  );
});

test('an empty bridge family list records a pass and other lists do not', () => {
  assert.deepEqual(emptyBridgeFamiliesRecord([]), {
    status: 'PASS',
    detail: 'no families',
  });
  assert.equal(emptyBridgeFamiliesRecord(['payments']), null);
  assert.equal(emptyBridgeFamiliesRecord('*'), null);
  assert.equal(emptyBridgeFamiliesRecord(undefined), null);
});

test('the JS bridge tier runs the fixture check on the parsed fixtures', () => {
  const parsed = { fixtures: ['parsed'] };
  const status = runBridgeTierCommand(
    'node',
    ['packages/bridge-contracts/scripts/check.mjs'],
    parsed,
    {
      check: (value) => {
        assert.equal(value, parsed);
        return 1;
      },
      runCommand: () => {
        throw new Error('native loader should not run');
      },
      cwd: '/repo',
    }
  );
  assert.equal(status, 1);
});

test('a native bridge tier command runs the loader and not the fixture check', () => {
  const calls = [];
  const status = runBridgeTierCommand(
    'node',
    ['packages/bridge-contracts/scripts/test-bridge.mjs', '--only=ios'],
    { fixtures: [] },
    {
      check: () => {
        throw new Error('fixture check should not run');
      },
      runCommand: (command, args, options) => {
        calls.push({ command, args, options });
        return 0;
      },
      cwd: '/repo',
    }
  );
  assert.equal(status, 0);
  assert.deepEqual(calls, [
    {
      command: 'node',
      args: ['packages/bridge-contracts/scripts/test-bridge.mjs', '--only=ios'],
      options: { cwd: '/repo' },
    },
  ]);
});

test('the gate process exits 0 for a shell expo run', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(repoRoot, 'tooling/package-gate/scripts/gate.mjs'),
      'core',
      '--only=expo',
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /RESULT @stripe\/react-native-core: SHELL \(not gate-ready; this run cannot close a package\)/
  );
});
