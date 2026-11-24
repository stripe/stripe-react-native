import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const harnessDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const fixture = path.join(
  harnessDir,
  'fixtures/coverage/no-sdk-hits.lcov'
);
const fixtureRoot = path.join(
  harnessDir,
  'fixtures/coverage/assert-layout'
);
const jsMissFixtureRoot = path.join(
  harnessDir,
  'fixtures/coverage/assert-layout-js-miss'
);
const passFixtureRoot = path.join(
  harnessDir,
  'fixtures/coverage/assert-layout-pass'
);

test('rn-coverage assert rejects an LCOV report with no SDK hits', () => {
  const result = spawnSync(
    'yarn',
    ['rn-coverage', 'assert', '--platform', 'ios', '--lcov', fixture],
    { cwd: harnessDir, encoding: 'utf8' }
  );
  assert.equal(
    result.status,
    2,
    `expected exit 2, got ${result.status}: ${result.stderr}`
  );
});

test('assert-coverage.sh fails when native artifacts have no SDK hits', () => {
  for (const platform of ['ios', 'android']) {
    const result = spawnSync(
      'bash',
      ['scripts/assert-coverage.sh', platform],
      {
        cwd: harnessDir,
        encoding: 'utf8',
        env: { ...process.env, COVERAGE_DIR: fixtureRoot },
      }
    );
    assert.equal(
      result.status,
      2,
      `${platform}: expected exit 2, got ${result.status}: ${result.stderr}${result.stdout}`
    );
  }
});

test('assert-coverage.sh fails on JS LCOV when native artifacts have SDK hits', () => {
  for (const platform of ['ios', 'android']) {
    const result = spawnSync(
      'bash',
      ['scripts/assert-coverage.sh', platform],
      {
        cwd: harnessDir,
        encoding: 'utf8',
        env: { ...process.env, COVERAGE_DIR: jsMissFixtureRoot },
      }
    );
    const output = `${result.stderr}${result.stdout}`;
    assert.equal(
      result.status,
      2,
      `${platform}: expected exit 2, got ${result.status}: ${output}`
    );
    assert.match(
      output,
      new RegExp(`js/${platform}/lcov\\.info`),
      `${platform}: expected JS LCOV assert failure in output`
    );
  }
});

test('assert-coverage.sh passes when native and JS artifacts show SDK hits', () => {
  for (const platform of ['ios', 'android']) {
    const result = spawnSync(
      'bash',
      ['scripts/assert-coverage.sh', platform],
      {
        cwd: harnessDir,
        encoding: 'utf8',
        env: { ...process.env, COVERAGE_DIR: passFixtureRoot },
      }
    );
    assert.equal(
      result.status,
      0,
      `${platform}: expected exit 0, got ${result.status}: ${result.stderr}${result.stdout}`
    );
  }
});
