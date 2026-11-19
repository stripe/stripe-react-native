import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  describeResult,
  formatHarnessStatus,
  formatScenarioLine,
  formatScenarioToken,
  withTimeout,
} from '../harness-format.mjs';

test('describeResult reports SDK error codes and ok', () => {
  assert.equal(describeResult({ error: { code: 'Failed' } }), 'returned error Failed');
  assert.equal(describeResult({ error: {} }), 'returned error unknown');
  assert.equal(describeResult(undefined), 'ok');
});

test('formatScenarioLine includes thrown timeout text', async () => {
  let timeoutError;
  try {
    await withTimeout(new Promise(() => {}), 5);
  } catch (error) {
    timeoutError = error;
  }
  const line = formatScenarioLine('slowScenario', { error: timeoutError });
  assert.match(line, /^slowScenario: threw Error: timed out after 5ms$/);
});

test('formatHarnessStatus distinguishes flushed and flush-failed', () => {
  assert.equal(formatHarnessStatus('flushed'), 'harness: flushed');
  assert.equal(formatHarnessStatus('flush-failed'), 'harness: flush-failed');
});

test('formatScenarioToken is the literal accessibility text', () => {
  assert.equal(formatScenarioToken('initStripe'), 'covered initStripe');
  assert.equal(
    formatScenarioToken('createPaymentMethod (incomplete card)'),
    'covered createPaymentMethod incomplete card'
  );
  assert.equal(formatScenarioToken('checkout detach'), 'covered checkout detach');
});
