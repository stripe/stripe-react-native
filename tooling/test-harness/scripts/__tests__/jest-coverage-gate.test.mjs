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
  runCoverageChecks,
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

test('checkAgainstBase allows a lowered floor with a new floorResets reason', () => {
  const reason =
    'baseline was recorded on 46250f94 and the gate runs on 77eb3f6a';
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };
  try {
    const floors = readFloors(
      JSON.stringify({
        packages: {
          '@stripe/stripe-react-native': {
            dir: '.',
            floor: {
              statements: 45.2,
              branches: 40.39,
              functions: 42.78,
              lines: 44.89,
            },
          },
        },
        unmeasured: {},
        scopeChanges: {},
        floorResets: {
          '@stripe/stripe-react-native': reason,
        },
      })
    );
    const base = readFloors(
      JSON.stringify({
        packages: {
          '@stripe/stripe-react-native': {
            dir: '.',
            floor: {
              statements: 45.28,
              branches: 40.78,
              functions: 42.78,
              lines: 44.96,
            },
          },
        },
        unmeasured: {},
        scopeChanges: {},
      })
    );
    const failures = [];
    checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
    assert.deepEqual(failures, []);
    assert.ok(
      logs.some((line) =>
        line.includes(
          'statements floor lowered from 45.28% (at FETCH_HEAD) to 45.2 (declared: ' +
            reason +
            ')'
        )
      )
    );
  } finally {
    console.log = originalLog;
  }
});

test('checkAgainstBase rejects a lowered floor with no floorResets reason', () => {
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
      floorResets: {},
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
      floorResets: {},
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) =>
      f.includes(
        'statements floor lowered from 40.72% (at FETCH_HEAD) to 30; add a "floorResets" entry'
      )
    )
  );
});

test('checkAgainstBase rejects a floorResets reason already on the base', () => {
  const reason = 'baseline was recorded on another tree';
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
      floorResets: {
        '@stripe/stripe-react-native': reason,
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
      floorResets: {
        '@stripe/stripe-react-native': reason,
      },
    })
  );
  const failures = [];
  checkAgainstBase(floors, base, 'FETCH_HEAD', failures);
  assert.ok(
    failures.some((f) =>
      f.includes('"floorResets" entry is already at FETCH_HEAD; remove it')
    )
  );
  assert.ok(
    failures.some((f) =>
      f.includes('statements floor lowered from 40.72% (at FETCH_HEAD) to 30')
    )
  );
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

test('--package checks that floor and does not measure other workspaces', () => {
  const lines = [];
  const log = console.log;
  console.log = (line) => lines.push(String(line));
  try {
    const failures = runCoverageChecks([
      '--package=@stripe/react-native-payments',
    ]);
    assert.deepEqual(failures, []);
    const text = lines.join('\n');
    assert.match(text, /@stripe\/react-native-payments/);
    assert.equal(text.includes('@stripe/stripe-react-native'), false);
    assert.equal(text.includes('--coverage'), false);
  } finally {
    console.log = log;
  }
  assert.throws(
    () => runCoverageChecks(['--package=']),
    /--package expects a workspace package name/
  );
  const missing = runCoverageChecks(['--package=@stripe/not-a-package']);
  assert.ok(
    missing.some((failure) =>
      failure.includes('@stripe/not-a-package: no entry in')
    )
  );
});

test('--package accepts a comma-separated list and checks only those floors', () => {
  const lines = [];
  const log = console.log;
  console.log = (line) => lines.push(String(line));
  try {
    const failures = runCoverageChecks([
      '--package=@stripe/react-native-payments,@stripe/react-native-core',
    ]);
    assert.deepEqual(failures, []);
    const text = lines.join('\n');
    assert.match(text, /@stripe\/react-native-payments/);
    assert.match(text, /@stripe\/react-native-core/);
    assert.equal(text.includes('@stripe/stripe-react-native'), false);
    assert.equal(text.includes('@stripe/react-native-issuing'), false);
    assert.equal(text.includes('--coverage'), false);
  } finally {
    console.log = log;
  }
});
