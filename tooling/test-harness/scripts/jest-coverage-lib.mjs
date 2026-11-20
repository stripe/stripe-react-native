import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const METRICS = ['statements', 'branches', 'functions', 'lines'];
export const FLOORS_PATH = 'tooling/test-harness/coverage-floors.json';
const DEFAULT_EXCLUDE = [
  'src/specs/**',
  '**/__tests__/**',
  '**/__fixtures__/**',
  '**/__mocks__/**',
  '**/*.d.ts',
];

const harnessDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const repoRoot = path.resolve(harnessDir, '../..');
const floorsFile = path.join(repoRoot, FLOORS_PATH);
const coverageRoot = path.join(repoRoot, 'coverage', 'jest');

// Istanbul reports percentages floored to two decimals. Compare and record
// them as integer basis points so floating point never shifts a floor.
export const toBasisPoints = (pct) => Math.round(pct * 100);
export const fromBasisPoints = (bp) => bp / 100;

function parseArgs(argv) {
  const args = { update: false, base: process.env.COVERAGE_FLOORS_BASE || '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--update') {
      args.update = true;
    } else if (argv[i] === '--base') {
      args.base = argv[(i += 1)] ?? '';
    } else {
      throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

export function readFloors(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed.packages !== 'object') {
    throw new Error(`${FLOORS_PATH} must have a "packages" object`);
  }
  parsed.unmeasured ??= {};
  parsed.scopeChanges ??= {};
  parsed.floorResets ??= {};
  return parsed;
}

function readManifest(dir) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, dir, 'package.json'), 'utf8')
  );
}

// The root workspace plus every directory matched by its "workspaces" globs.
function workspaces() {
  const result = [{ name: readManifest('.').name, dir: '.' }];
  for (const pattern of readManifest('.').workspaces ?? []) {
    const parent = pattern.replace(/\/\*$/, '');
    const parentDir = path.join(repoRoot, parent);
    if (!pattern.endsWith('/*') || !fs.existsSync(parentDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(parentDir).sort()) {
      const dir = path.posix.join(parent, entry);
      if (fs.existsSync(path.join(repoRoot, dir, 'package.json'))) {
        result.push({ name: readManifest(dir).name, dir });
      }
    }
  }
  return result;
}

export function hasSources(dir) {
  const srcDir = path.join(repoRoot, dir, 'src');
  if (!fs.existsSync(srcDir)) {
    return false;
  }
  return fs
    .readdirSync(srcDir, { recursive: true })
    .some((file) => /\.tsx?$/.test(file) && !file.endsWith('.d.ts'));
}

function measure(name, pkg) {
  const outDir = path.join(coverageRoot, pkg.dir === '.' ? 'root' : pkg.dir);
  fs.rmSync(outDir, { recursive: true, force: true });
  const exclude = [...DEFAULT_EXCLUDE, ...(pkg.exclude ?? [])];
  const jestArgs = [
    '--coverage',
    '--coverageReporters=json-summary',
    '--coverageReporters=lcov',
    '--coverageReporters=text-summary',
    `--coverageDirectory=${outDir}`,
    '--collectCoverageFrom=src/**/*.{ts,tsx}',
    ...exclude.map((glob) => `--collectCoverageFrom=!${glob}`),
  ];
  console.log(`\n[coverage] ${name}: jest ${jestArgs.join(' ')}`);
  const result = spawnSync(
    'yarn',
    ['workspace', name, 'test', '--passWithNoTests', ...jestArgs],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error(`Jest failed for ${name} (exit ${result.status})`);
  }
  const summary = JSON.parse(
    fs.readFileSync(path.join(outDir, 'coverage-summary.json'), 'utf8')
  );
  // Jest instruments nothing when a package has no tests and reports
  // "Unknown"; that package's coverage is 0.
  if (METRICS.some((m) => typeof summary.total[m].pct !== 'number')) {
    console.warn(
      `[coverage] ${name}: Jest measured no source files (no tests yet?); counting 0%`
    );
  }
  return Object.fromEntries(
    METRICS.map((m) => {
      const pct = summary.total[m].pct;
      return [m, typeof pct === 'number' ? toBasisPoints(pct) : 0];
    })
  );
}

function baseFloors(ref) {
  try {
    const text = execFileSync('git', ['show', `${ref}:${FLOORS_PATH}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return readFloors(text);
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    if (/does not exist|exists on disk, but not in/.test(stderr)) {
      console.log(`[coverage] ${FLOORS_PATH} is new relative to ${ref}`);
      return readFloors('{"packages": {}}');
    }
    throw new Error(`Cannot read ${FLOORS_PATH} at ${ref}: ${stderr.trim()}`);
  }
}

// react-native-coverage belongs in the harness only. Autolinking would ship
// its native module to any app that installs a package depending on it.
export function coverageDependentsFromManifests(manifests) {
  return manifests
    .filter((pkg) => pkg.name !== '@stripe/react-native-test-harness')
    .filter((pkg) =>
      [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
      ].some((field) => pkg[field]?.['react-native-coverage'] != null)
    )
    .map((pkg) => pkg.name);
}

function coverageDependents(all) {
  return coverageDependentsFromManifests(all.map(({ dir }) => readManifest(dir)));
}

export function checkWorkspacesListed(all, floors, args, failures) {
  const dirs = new Map(all.map(({ name, dir }) => [name, dir]));
  for (const [name, pkg] of Object.entries(floors.packages)) {
    if (!dirs.has(name)) {
      failures.push(
        `${name}: listed in "packages" but is not a workspace; fix the name or remove the entry`
      );
    } else if (pkg.dir !== dirs.get(name)) {
      failures.push(
        `${name}: "dir" is ${pkg.dir} but the workspace is at ${dirs.get(name)}`
      );
    }
  }
  for (const name of Object.keys(floors.unmeasured)) {
    if (!dirs.has(name)) {
      failures.push(
        `${name}: listed in "unmeasured" but is not a workspace; fix the name or remove the entry`
      );
    }
  }
  for (const { name, dir } of all) {
    if (floors.packages[name] || floors.unmeasured[name]) {
      continue;
    }
    if (!hasSources(dir)) {
      continue;
    }
    if (args.update) {
      floors.packages[name] = { dir, floor: null };
      console.log(`[coverage] ${name}: added to ${FLOORS_PATH}`);
    } else {
      failures.push(
        `${name}: ${dir}/src has sources but no entry in ${FLOORS_PATH}; run \`yarn coverage:floors:update\` to record its baseline`
      );
    }
  }
  for (const [name, reason] of Object.entries(floors.unmeasured)) {
    console.log(`[coverage] ${name}: not measured (${reason})`);
  }
}

export function checkPackage(name, pkg, args, failures, measureFn = measure) {
  if (!hasSources(pkg.dir)) {
    if (pkg.floor != null) {
      failures.push(`${name}: has a floor but no sources under ${pkg.dir}/src`);
    } else {
      console.log(
        `\n[coverage] ${name}: no sources under ${pkg.dir}/src yet; no floor`
      );
    }
    return;
  }
  const measured = measureFn(name, pkg);
  const measuredPct = Object.fromEntries(
    METRICS.map((m) => [m, fromBasisPoints(measured[m])])
  );
  if (pkg.floor == null) {
    if (args.update) {
      pkg.floor = measuredPct;
      console.log(
        `[coverage] ${name}: recorded baseline floor ${JSON.stringify(pkg.floor)}`
      );
      return;
    }
    failures.push(
      `${name}: has sources but no floor; run \`yarn coverage:floors:update\` to record its baseline`
    );
    return;
  }
  for (const metric of METRICS) {
    const floor = toBasisPoints(pkg.floor[metric]);
    const value = measured[metric];
    if (value < floor) {
      failures.push(
        `${name}: ${metric} ${fromBasisPoints(value)}% is below its floor of ${fromBasisPoints(floor)}%`
      );
    } else if (args.update && value > floor) {
      pkg.floor[metric] = fromBasisPoints(value);
      console.log(
        `[coverage] ${name}: raised ${metric} floor ${fromBasisPoints(floor)}% -> ${pkg.floor[metric]}%`
      );
    }
  }
  console.log(
    `[coverage] ${name}: measured ${JSON.stringify(measuredPct)} floor ${JSON.stringify(pkg.floor)}`
  );
}

// A scope change (dropped package, new exclude, changed dir) passes only when
// this change names it in "scopeChanges". A lowered floor passes only when
// this change names it in "floorResets". An entry already present at the base
// is stale: it would let later changes repeat the exception unreviewed.
export function checkAgainstBase(floors, base, ref, failures) {
  const scopeChanges = floors.scopeChanges ?? {};
  const baseScopeChanges = base.scopeChanges ?? {};
  const floorResets = floors.floorResets ?? {};
  const baseFloorResets = base.floorResets ?? {};
  const freshReason = (current, previous, name) => {
    const reason = current[name];
    return reason != null && previous[name] !== reason;
  };
  const declared = (name) => freshReason(scopeChanges, baseScopeChanges, name);
  const narrowed = (name, message) => {
    if (declared(name)) {
      console.log(
        `[coverage] ${name}: ${message} (declared: ${scopeChanges[name]})`
      );
    } else {
      failures.push(
        `${name}: ${message} compared with ${ref}; add a "scopeChanges" entry with the reason if this is intended`
      );
    }
  };

  for (const [name, basePkg] of Object.entries(base.packages)) {
    const pkg = floors.packages[name];
    if (!pkg) {
      narrowed(name, 'removed from the measured packages');
      continue;
    }
    if (pkg.dir !== basePkg.dir) {
      narrowed(name, `dir changed from ${basePkg.dir} to ${pkg.dir}`);
    }
    const baseExclude = new Set(basePkg.exclude ?? []);
    const added = (pkg.exclude ?? []).filter((glob) => !baseExclude.has(glob));
    if (added.length > 0) {
      narrowed(name, `exclude gained ${added.join(', ')}`);
    }
    for (const metric of METRICS) {
      const before = basePkg.floor?.[metric];
      const after = pkg.floor?.[metric];
      if (
        before != null &&
        (after == null || toBasisPoints(after) < toBasisPoints(before))
      ) {
        const message = `${metric} floor lowered from ${before}% (at ${ref}) to ${after ?? 'none'}`;
        if (freshReason(floorResets, baseFloorResets, name)) {
          console.log(
            `[coverage] ${name}: ${message} (declared: ${floorResets[name]})`
          );
        } else {
          failures.push(
            `${name}: ${message}; add a "floorResets" entry with the reason if this reset is intended`
          );
        }
      }
    }
  }
  for (const [name, reason] of Object.entries(scopeChanges)) {
    if (baseScopeChanges[name] === reason) {
      failures.push(
        `${name}: "scopeChanges" entry is already at ${ref}; remove it`
      );
    }
  }
  for (const [name, reason] of Object.entries(floorResets)) {
    if (baseFloorResets[name] === reason) {
      failures.push(
        `${name}: "floorResets" entry is already at ${ref}; remove it`
      );
    }
  }
  console.log(`[coverage] compared floors with ${ref}`);
}

export function runCoverageChecks(argv) {
  const args = parseArgs(argv);
  const floors = readFloors(fs.readFileSync(floorsFile, 'utf8'));
  const original = JSON.stringify(floors);
  const all = workspaces();
  const failures = coverageDependents(all).map(
    (name) =>
      `${name}: depends on react-native-coverage; only @stripe/react-native-test-harness may`
  );

  checkWorkspacesListed(all, floors, args, failures);
  for (const [name, reason] of Object.entries(floors.scopeChanges)) {
    console.log(`[coverage] ${name}: declared scope change (${reason})`);
  }
  for (const [name, reason] of Object.entries(floors.floorResets)) {
    console.log(`[coverage] ${name}: declared floor reset (${reason})`);
  }
  for (const [name, pkg] of Object.entries(floors.packages)) {
    checkPackage(name, pkg, args, failures);
  }
  if (args.base) {
    checkAgainstBase(floors, baseFloors(args.base), args.base, failures);
  }

  if (JSON.stringify(floors) !== original) {
    fs.writeFileSync(floorsFile, `${JSON.stringify(floors, null, 2)}\n`);
    spawnSync('yarn', ['prettier', '--write', FLOORS_PATH], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    console.log(`[coverage] updated ${FLOORS_PATH}`);
  }
  return failures;
}
