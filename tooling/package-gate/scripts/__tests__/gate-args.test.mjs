import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bridgeTierCommands, parseArgs } from '../checks/gate-args.mjs';

const CHECK = 'packages/bridge-contracts/scripts/check.mjs';
const TEST_BRIDGE = 'packages/bridge-contracts/scripts/test-bridge.mjs';

test('the CI JS arguments keep the gate steps and a js-only bridge tier', () => {
  const args = parseArgs(['--all', '--skip=expo', '--bridge=js']);
  assert.equal(args.all, true);
  assert.deepEqual(args.steps, ['spi', 'pack', 'bridge', 'coverage']);
  assert.deepEqual(args.bridge, ['js']);
  assert.deepEqual(bridgeTierCommands(args.bridge), [['node', [CHECK]]]);
});

test('the bridge tier never spawns the contract Jest file', () => {
  const commands = bridgeTierCommands(
    parseArgs(['--bridge=js,ios,android']).bridge
  );
  assert.deepEqual(commands, [
    ['node', [CHECK]],
    ['node', [TEST_BRIDGE, '--only=ios,android']],
  ]);
  assert.equal(JSON.stringify(commands).includes('jest'), false);
  assert.equal(
    JSON.stringify(commands).includes('bridgeContracts.test'),
    false
  );
});

test('native bridge platforms stay on the native loaders', () => {
  assert.deepEqual(bridgeTierCommands(parseArgs(['--bridge=ios']).bridge), [
    ['node', [TEST_BRIDGE, '--only=ios']],
  ]);
  assert.deepEqual(bridgeTierCommands(parseArgs(['--bridge=android']).bridge), [
    ['node', [TEST_BRIDGE, '--only=android']],
  ]);
});

test('an unknown --platforms value names ios and android', () => {
  assert.throws(
    () => parseArgs(['--platforms=web']),
    /--platforms: unknown web; use ios, android/
  );
});

test('an empty --only= or --platforms= value is a usage error', () => {
  assert.throws(
    () => parseArgs(['--only=']),
    /--only: expected one of spi, pack, bridge, coverage, expo/
  );
  assert.throws(
    () => parseArgs(['--platforms=']),
    /--platforms: expected one of ios, android/
  );
});

test('EXPO_SMOKE_SDK sets the smoke SDK when --expo-sdk is absent', () => {
  const previous = process.env.EXPO_SMOKE_SDK;
  process.env.EXPO_SMOKE_SDK = '54';
  try {
    assert.equal(parseArgs([]).expoSdk, '54');
    assert.equal(parseArgs(['--expo-sdk=52']).expoSdk, '52');
  } finally {
    if (previous === undefined) delete process.env.EXPO_SMOKE_SDK;
    else process.env.EXPO_SMOKE_SDK = previous;
  }
});

test('an empty --bridge= value is a usage error', () => {
  assert.throws(
    () => parseArgs(['--bridge=']),
    /--bridge: expected one of js, ios, android/
  );
  assert.throws(
    () => parseArgs(['--bridge=,']),
    /--bridge: expected one of js, ios, android/
  );
});

test('--skip=preview is rejected once preview is not a step', () => {
  assert.throws(
    () => parseArgs(['--skip=preview']),
    /--skip: unknown preview; use spi, pack, bridge, coverage, expo/
  );
});

test('unknown bridge platforms and options are rejected', () => {
  assert.throws(
    () => parseArgs(['--bridge=web']),
    /--bridge: unknown web; use js, ios, android/
  );
  assert.throws(
    () => parseArgs(['--skip=jest']),
    /--skip: unknown jest; use spi, pack, bridge, coverage, expo/
  );
  assert.throws(() => parseArgs(['--coverage']), /Unknown option --coverage/);
});
