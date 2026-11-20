import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  METRICS,
  checkAgainstBase,
  checkPackage,
  checkWorkspacesListed,
  coverageDependentsFromManifests,
  FLOORS_PATH,
  fromBasisPoints,
  hasSources,
  readFloors,
  toBasisPoints,
} from '../jest-coverage-lib.mjs';

const stripeNativeFloor = {
  dir: '.',
  exclude: ['src/types/**', 'src/plugin/**'],
  floor: {
    statements: 40.72,
    branches: 33.56,
    functions: 39.72,
    lines: 40.54,
  },
};

const passMeasure = () =>
  Object.fromEntries(
    METRICS.map((m) => [m, toBasisPoints(stripeNativeFloor.floor[m])])
  );

const belowFloorMeasure = () =>
  Object.fromEntries(
    METRICS.map((m, i) => [
      m,
      i === 0 ? toBasisPoints(1) : toBasisPoints(stripeNativeFloor.floor[m]),
    ])
  );

test('checkPackage rejects coverage below the statements floor', () => {
  const failures = [];
  const pkg = structuredClone(stripeNativeFloor);
  checkPackage(
    '@stripe/stripe-react-native',
    pkg,
    { update: false, base: '' },
    failures,
    belowFloorMeasure
  );
  assert.ok(
    failures.some((f) =>
      f.includes('statements 1% is below its floor of 40.72%')
    )
  );
});

test('checkAgainstBase rejects a lowered floor even with a new scopeChanges reason', () => {
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          dir: '.',
          floor: { statements: 30, branches: 33.56, functions: 39.72, lines: 40.54 },
        },
      },
      unmeasured: {},
      scopeChanges: {
        '@stripe/stripe-react-native': 'narrowed the measured surface',
      },
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          dir: '.',
          floor: stripeNativeFloor.floor,
        },
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) =>
      f.includes(
        'statements floor lowered from 40.72% (at FETCH_HEAD) to 30'
      )
    )
  );
});

test('checkAgainstBase rejects a lowered floor', () => {
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          dir: '.',
          floor: { statements: 30, branches: 33.56, functions: 39.72, lines: 40.54 },
        },
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          dir: '.',
          floor: stripeNativeFloor.floor,
        },
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) =>
      f.includes('statements floor lowered from 40.72% (at FETCH_HEAD)')
    )
  );
});

test('checkAgainstBase rejects a new exclude without scopeChanges', () => {
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          dir: '.',
          exclude: ['src/types/**', 'src/plugin/**', 'src/legacy/**'],
          floor: stripeNativeFloor.floor,
        },
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) => f.includes('exclude gained src/legacy/**'))
  );
});

test('coverageDependents rejects react-native-coverage outside the harness', () => {
  assert.deepEqual(
    coverageDependentsFromManifests([
      { name: '@stripe/react-native-test-harness', devDependencies: { 'react-native-coverage': '0.2.2' } },
    ]),
    []
  );
  assert.deepEqual(
    coverageDependentsFromManifests([
      {
        name: '@stripe/react-native-payments',
        dependencies: { 'react-native-coverage': '0.2.2' },
      },
    ]),
    ['@stripe/react-native-payments']
  );
});

test('coverageDependents rejects react-native-coverage in other dependency fields', () => {
  for (const field of [
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    assert.deepEqual(
      coverageDependentsFromManifests([
        {
          name: `@stripe/pkg-${field}`,
          [field]: { 'react-native-coverage': '0.2.2' },
        },
      ]),
      [`@stripe/pkg-${field}`]
    );
  }
});

test('checkPackage passes at the recorded floor', () => {
  const failures = [];
  checkPackage(
    '@stripe/stripe-react-native',
    structuredClone(stripeNativeFloor),
    { update: false, base: '' },
    failures,
    passMeasure
  );
  assert.deepEqual(failures, []);
});

test('basis-point rounding matches Istanbul two-decimal floors', () => {
  assert.equal(fromBasisPoints(toBasisPoints(40.719)), 40.72);
});

test('checkWorkspacesListed rejects an unknown package name', () => {
  const failures = [];
  checkWorkspacesListed(
    [{ name: '@stripe/stripe-react-native', dir: '.' }],
    readFloors(
      JSON.stringify({
        packages: {
          '@stripe/stripe-react-native': { dir: '.' },
          '@stripe/not-a-workspace': { dir: 'nope' },
        },
        unmeasured: {},
        scopeChanges: {},
      })
    ),
    { update: false, base: '' },
    failures
  );
  assert.ok(
    failures.some((f) =>
      f.includes(
        '@stripe/not-a-workspace: listed in "packages" but is not a workspace'
      )
    )
  );
});

test('checkWorkspacesListed rejects a dir that does not match the workspace', () => {
  const failures = [];
  checkWorkspacesListed(
    [{ name: '@stripe/stripe-react-native', dir: '.' }],
    readFloors(
      JSON.stringify({
        packages: {
          '@stripe/stripe-react-native': { dir: 'packages/wrong' },
        },
        unmeasured: {},
        scopeChanges: {},
      })
    ),
    { update: false, base: '' },
    failures
  );
  assert.ok(
    failures.some((f) =>
      f.includes(
        '@stripe/stripe-react-native: "dir" is packages/wrong but the workspace is at .'
      )
    )
  );
});

test('checkWorkspacesListed rejects an unknown unmeasured key', () => {
  const failures = [];
  checkWorkspacesListed(
    [{ name: '@stripe/stripe-react-native', dir: '.' }],
    readFloors(
      JSON.stringify({
        packages: {
          '@stripe/stripe-react-native': { dir: '.' },
        },
        unmeasured: { '@stripe/ghost': 'not a workspace' },
        scopeChanges: {},
      })
    ),
    { update: false, base: '' },
    failures
  );
  assert.ok(
    failures.some((f) =>
      f.includes(
        '@stripe/ghost: listed in "unmeasured" but is not a workspace'
      )
    )
  );
});

test('checkWorkspacesListed inserts a missing workspace when update is enabled', () => {
  const failures = [];
  const floors = readFloors(
    JSON.stringify({ packages: {}, unmeasured: {}, scopeChanges: {} })
  );
  checkWorkspacesListed(
    [{ name: '@stripe/stripe-react-native', dir: '.' }],
    floors,
    { update: true, base: '' },
    failures
  );
  assert.deepEqual(failures, []);
  assert.deepEqual(floors.packages['@stripe/stripe-react-native'], {
    dir: '.',
    floor: null,
  });
});

test('checkWorkspacesListed rejects sourced workspaces missing from floors', () => {
  assert.ok(hasSources('.'));
  const failures = [];
  checkWorkspacesListed(
    [{ name: '@stripe/stripe-react-native', dir: '.' }],
    readFloors(JSON.stringify({ packages: {}, unmeasured: {}, scopeChanges: {} })),
    { update: false, base: '' },
    failures
  );
  assert.ok(
    failures.some((f) =>
      f.includes(`has sources but no entry in ${FLOORS_PATH}`)
    )
  );
});

test('checkPackage rejects sources without a recorded floor', () => {
  const failures = [];
  checkPackage(
    '@stripe/stripe-react-native',
    { dir: '.', floor: null },
    { update: false, base: '' },
    failures,
    passMeasure
  );
  assert.ok(
    failures.some((f) => f.includes('has sources but no floor'))
  );
});

test('checkPackage records a baseline floor when update is enabled', () => {
  const failures = [];
  const pkg = { dir: '.', floor: null };
  checkPackage(
    '@stripe/stripe-react-native',
    pkg,
    { update: true, base: '' },
    failures,
    passMeasure
  );
  assert.deepEqual(failures, []);
  assert.deepEqual(pkg.floor, stripeNativeFloor.floor);
});

test('checkPackage raises an existing floor on update when measured above it', () => {
  const failures = [];
  const pkg = structuredClone(stripeNativeFloor);
  const raisedMeasure = () =>
    Object.fromEntries(
      METRICS.map((m) => [m, toBasisPoints(stripeNativeFloor.floor[m]) + 100])
    );
  checkPackage(
    '@stripe/stripe-react-native',
    pkg,
    { update: true, base: '' },
    failures,
    raisedMeasure
  );
  assert.deepEqual(failures, []);
  assert.ok(pkg.floor.statements > stripeNativeFloor.floor.statements);
});

test('checkPackage update leaves the floor unchanged when measured below it', () => {
  const failures = [];
  const pkg = structuredClone(stripeNativeFloor);
  const originalFloor = structuredClone(pkg.floor);
  checkPackage(
    '@stripe/stripe-react-native',
    pkg,
    { update: true, base: '' },
    failures,
    belowFloorMeasure
  );
  assert.ok(failures.length > 0);
  assert.deepEqual(pkg.floor, originalFloor);
});

test('checkAgainstBase rejects a removed package without scopeChanges', () => {
  const floors = readFloors(
    JSON.stringify({
      packages: {},
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) => f.includes('removed from the measured packages'))
  );
});

test('checkAgainstBase allows a removed package with a new scopeChanges reason', () => {
  const reason = 'moved to unmeasured';
  const floors = readFloors(
    JSON.stringify({
      packages: {},
      unmeasured: {},
      scopeChanges: {
        '@stripe/stripe-react-native': reason,
      },
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.deepEqual(failures, []);
});

test('checkAgainstBase rejects a dir change without scopeChanges', () => {
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          ...structuredClone(stripeNativeFloor),
          dir: 'packages/core',
        },
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(failures.some((f) => f.includes('dir changed from . to packages/core')));
});

test('checkAgainstBase allows a dir change with a new scopeChanges reason', () => {
  const reason = 'workspace layout moved';
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': {
          ...structuredClone(stripeNativeFloor),
          dir: 'packages/core',
        },
      },
      unmeasured: {},
      scopeChanges: {
        '@stripe/stripe-react-native': reason,
      },
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.deepEqual(failures, []);
});

test('checkAgainstBase rejects a stale scopeChanges entry', () => {
  const reason = 'dropped legacy fixtures';
  const floors = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {
        '@stripe/stripe-react-native': reason,
      },
    })
  );
  const base = readFloors(
    JSON.stringify({
      packages: {
        '@stripe/stripe-react-native': structuredClone(stripeNativeFloor),
      },
      unmeasured: {},
      scopeChanges: {
        '@stripe/stripe-react-native': reason,
      },
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) => f.includes('"scopeChanges" entry is already at FETCH_HEAD'))
  );
});
