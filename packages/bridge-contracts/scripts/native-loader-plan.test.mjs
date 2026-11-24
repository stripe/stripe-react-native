import assert from 'node:assert/strict';
import { test } from 'node:test';
import { main, nativeLoaderPlan, parseBridgeArgs } from './test-bridge.mjs';

test('parseBridgeArgs reads --only and --families', () => {
  assert.deepEqual(
    parseBridgeArgs([
      'node',
      'test-bridge.mjs',
      '--only=ios,android',
      '--families=payment-sheet,embedded',
    ]),
    {
      selected: ['ios', 'android'],
      unknown: [],
      families: ['payment-sheet', 'embedded'],
    }
  );
  assert.deepEqual(parseBridgeArgs(['node', 'test-bridge.mjs']), {
    selected: ['js', 'ios', 'android'],
    unknown: [],
    families: null,
  });
  assert.deepEqual(
    parseBridgeArgs(['node', 'test-bridge.mjs', '--only=js,nope']).unknown,
    ['nope']
  );
});

function rejectMain(argv) {
  const errors = [];
  const exit = process.exit;
  const error = console.error;
  process.exit = (code) => {
    const thrown = new Error('exit');
    thrown.code = code;
    throw thrown;
  };
  console.error = (line) => errors.push(String(line));
  try {
    assert.throws(
      () => main(argv),
      (thrown) => thrown.code === 2
    );
  } finally {
    process.exit = exit;
    console.error = error;
  }
  return errors.join('\n');
}

test('main rejects an unknown step and an unknown family before any loader', () => {
  assert.match(
    rejectMain(['node', 'test-bridge.mjs', '--only=nope']),
    /Unknown step\(s\): nope/
  );
  assert.match(
    rejectMain([
      'node',
      'test-bridge.mjs',
      '--only=ios',
      '--families=not-a-family',
    ]),
    /Unknown fixture family "not-a-family"/
  );
});

test('native loaders receive a family filter only when one is set', () => {
  const families = ['payment-sheet', 'embedded'];
  const filtered = nativeLoaderPlan(families);
  assert.equal(
    filtered.ios.env.TEST_RUNNER_BRIDGE_FIXTURE_FAMILIES,
    'payment-sheet,embedded'
  );
  assert.equal(
    filtered.android.args.includes(
      '-PbridgeContracts.families=payment-sheet,embedded'
    ),
    true
  );
  const all = nativeLoaderPlan(null);
  assert.deepEqual(all.ios.env, {});
  assert.equal(
    all.android.args.some((arg) =>
      arg.startsWith('-PbridgeContracts.families=')
    ),
    false
  );
  assert.deepEqual(nativeLoaderPlan([]), all);
});
