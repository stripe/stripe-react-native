#!/usr/bin/env node
// The per-package done gate. A package is done only when this passes for it.
//
//   yarn gate:package <package>...            every step for those packages
//   yarn gate:package --all --skip=expo --bridge=js   CI JS job
//   yarn gate:package payments --only=pack,spi
//
// <package> is an npm name, an alias from packages.json (core, payments,
// stripe-react-native, ...), or a directory. Run from a package directory
// with no argument to gate that package.
//
// Steps: spi, pack, bridge, coverage, expo. Options:
//   --only=<steps> / --skip=<steps>
//   --bridge=<platforms>         bridge contract platforms: js, ios, android (default all;
//                                ios needs `yarn pods` and honours IOS_SIMULATOR)
//   --platforms=ios,android      Expo smoke build platforms (default both)
//   --expo-sdk=<n>               Expo SDK for the smoke app (or EXPO_SMOKE_SDK)
//   --keep-smoke                 keep the smoke app directory
//   --verbose                    echo build output, not just the log path
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadParsedFixtures } from '../../../packages/bridge-contracts/scripts/check.mjs';
import { checkFamilies, familyIndex } from './checks/bridge-check.mjs';
import {
  findPackage,
  gateDir,
  loadConfig,
  PLATFORMS,
  repoRoot,
  unlistedPackages,
} from './checks/config.mjs';
import { expoSmoke } from './checks/expo-smoke.mjs';
import { checkPackage } from './checks/pack-check.mjs';
import { run } from './checks/run.mjs';
import { checkSpi } from './checks/spi-check.mjs';

const STEPS = ['spi', 'pack', 'bridge', 'coverage', 'expo'];
const SHELL_STEPS = new Set(['spi', 'pack']);
const BRIDGE_PLATFORMS = ['js', 'ios', 'android'];
const CONFIG_ALIAS = '(config)';

function parseList(value, allowed, flag) {
  const list = value.split(',').filter(Boolean);
  const unknown = list.filter((item) => !allowed.includes(item));
  if (unknown.length) {
    throw new Error(
      `${flag}: unknown ${unknown.join(', ')}; use ${allowed.join(', ')}`
    );
  }
  return list;
}

export function parseArgs(argv) {
  const args = {
    queries: [],
    all: false,
    steps: [...STEPS],
    bridge: [...BRIDGE_PLATFORMS],
    platforms: [...PLATFORMS],
    expoSdk: process.env.EXPO_SMOKE_SDK || undefined,
    keepSmoke: false,
    verbose: false,
  };
  for (const arg of argv) {
    const [flag, value = ''] = arg.split(/[=](.*)/s);
    if (flag === '--all') args.all = true;
    else if (flag === '--only') args.steps = parseList(value, STEPS, flag);
    else if (flag === '--skip') {
      const skip = parseList(value, STEPS, flag);
      args.steps = args.steps.filter((step) => !skip.includes(step));
    } else if (flag === '--bridge')
      args.bridge = parseList(value, BRIDGE_PLATFORMS, flag);
    else if (flag === '--platforms')
      args.platforms = parseList(value, PLATFORMS, flag);
    else if (flag === '--expo-sdk') args.expoSdk = value;
    else if (flag === '--keep-smoke') args.keepSmoke = true;
    else if (flag === '--verbose') args.verbose = true;
    else if (flag.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else args.queries.push(arg);
  }
  return args;
}

export function shouldBuildPackages(env, { ready, packOrExpo }) {
  return Boolean(
    ready &&
      packOrExpo &&
      !env.NX_TASK_TARGET_PROJECT &&
      env.GATE_SKIP_BUILD !== '1'
  );
}

export function emptyBridgeFamiliesRecord(families) {
  if (Array.isArray(families) && families.length === 0) {
    return { status: 'PASS', detail: 'no families' };
  }
  return null;
}

const CONFIG = { alias: CONFIG_ALIAS };

export function skippedSteps(args) {
  const skipped = STEPS.filter((step) => !args.steps.includes(step));
  if (
    args.steps.includes('bridge') &&
    args.bridge.length < BRIDGE_PLATFORMS.length
  ) {
    const absent = BRIDGE_PLATFORMS.filter((p) => !args.bridge.includes(p));
    skipped.push(`bridge on ${absent.join(', ')}`);
  }
  if (args.steps.includes('expo') && args.platforms.length < PLATFORMS.length) {
    const absent = PLATFORMS.filter((p) => !args.platforms.includes(p));
    skipped.push(`expo on ${absent.join(', ')}`);
  }
  return skipped;
}

export function gateVerdict({ results, selected, missing, skipped }) {
  const lines = [];
  const configFailed = results.some(
    (row) => row.step === 'config' && row.status === 'FAIL'
  );
  if (configFailed) {
    lines.push('RESULT gate config: FAIL (see "gate config" above)');
  }
  const failedFor = (pkg) =>
    results.some(
      (row) =>
        row.status === 'FAIL' &&
        (row.pkg === pkg.alias ||
          row.pkg === CONFIG_ALIAS ||
          (row.pkg === '(all)' && pkg.status === 'ready'))
    );
  for (const pkg of selected) {
    let verdict;
    if (missing.includes(pkg))
      verdict = `FAIL (configured directory ${pkg.dir} has no package.json)`;
    else if (failedFor(pkg)) verdict = 'FAIL';
    else if (pkg.status === 'shell')
      verdict = 'SHELL (not gate-ready; this run cannot close a package)';
    else if (skipped.length)
      verdict = `PARTIAL (skipped: ${skipped.join(', ')})`;
    else verdict = 'PASS';
    lines.push(`RESULT ${pkg.name}: ${verdict}`);
  }
  const failed = results.some((row) => row.status === 'FAIL');
  return { lines, exitCode: failed ? 1 : 0 };
}
const results = [];
const record = (pkg, step, status, detail = '') =>
  results.push({ pkg: pkg?.alias ?? '(all)', step, status, detail });

function heading(text) {
  console.log(`\n=== ${text}`);
}

function report(lines, prefix = '  ') {
  for (const line of lines) console.log(`${prefix}${line}`);
}

function spiStep(pkg) {
  heading(
    `${pkg.alias}: stripe-ios SPI imports (${pkg.iosSources.join(', ')})`
  );
  const { forbidden, allowed, violations, stale } = checkSpi({
    repoRoot,
    roots: pkg.iosSources,
    allowlistFile: path.join(gateDir, 'spi-allowlist.json'),
  });
  const forbiddenText = forbidden.map((name) => `_spi(${name})`).join(', ');
  for (const site of violations) {
    console.error(
      `  ✖ ${site.file}:${site.lineNumber} imports ${site.spis.map((s) => `_spi(${s})`).join(', ')}: ${site.line}`
    );
  }
  for (const entry of stale) {
    console.error(
      `  ✖ stale allowlist entry (no longer in the source; remove it from spi-allowlist.json): ${entry.file}: ${entry.line}`
    );
  }
  if (allowed.length) {
    console.log(
      `  ${allowed.length} allowlisted site(s) in tooling/package-gate/spi-allowlist.json, kept until stripe-react-native#2787 switches them to _spi(ReactNativeSDK)`
    );
  }
  const failed = violations.length + stale.length;
  if (failed) {
    console.error(
      `  Non-test iOS code must not use ${forbiddenText}. Reach internal stripe-ios APIs through _spi(ReactNativeSDK) instead.`
    );
  } else {
    console.log(`  ✔ no ${forbiddenText} import outside the allowlist`);
  }
  record(pkg, 'spi', failed ? 'FAIL' : 'PASS', `${allowed.length} allowlisted`);
}

function packStep(pkg) {
  heading(`${pkg.alias}: packed contents (npm pack --dry-run)`);
  const { errors, notes, files, filename, size } = checkPackage(pkg, repoRoot);
  console.log(`  ${filename}: ${files.length} files, ${size} bytes`);
  report(notes, '  note: ');
  for (const error of errors) console.error(`  ✖ ${error}`);
  if (!errors.length)
    console.log(
      '  ✔ entry points, subpath exports, and required files are packed'
    );
  record(pkg, 'pack', errors.length ? 'FAIL' : 'PASS', `${files.length} files`);
}

function bridgeFamiliesStep(pkg, contracts) {
  heading(`${pkg.alias}: bridge contract fixtures`);
  const empty = emptyBridgeFamiliesRecord(pkg.families);
  if (empty) {
    console.log(
      '  no bridge families (the package has no untyped bridge values)'
    );
    record(pkg, 'bridge', empty.status, empty.detail);
    return;
  }
  const { errors, summary } = checkFamilies({
    ...contracts,
    families: pkg.families,
  });
  for (const { family, entries, fixtures } of summary) {
    console.log(
      `  ${family.padEnd(22)} ${String(fixtures).padStart(3)} fixtures for ${entries} entries`
    );
  }
  for (const error of errors) console.error(`  ✖ ${error}`);
  record(
    pkg,
    'bridge',
    errors.length ? 'FAIL' : 'PASS',
    `${summary.length} families`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  let selected;
  if (args.all) {
    selected = config.packages;
  } else {
    const queries = args.queries.length ? args.queries : ['.'];
    selected = queries.map((query) => {
      const pkg = findPackage(config.packages, query);
      if (!pkg) {
        throw new Error(
          `No package "${query}" in tooling/package-gate/packages.json. Known: ${config.packages.map((p) => p.alias).join(', ')}`
        );
      }
      return pkg;
    });
  }
  const wants = (step) => args.steps.includes(step);

  const unlisted = unlistedPackages(config);
  const missing = config.packages.filter(
    (pkg) => !fs.existsSync(path.join(repoRoot, pkg.dir, 'package.json'))
  );
  if (unlisted.length || missing.length) {
    heading('gate config');
    if (unlisted.length) {
      console.error(
        `  ✖ not in tooling/package-gate/packages.json (add them, or list them under "notGated"): ${unlisted.join(', ')}`
      );
      record(CONFIG, 'config', 'FAIL', `unlisted: ${unlisted.join(', ')}`);
    }
    for (const pkg of missing) {
      console.error(
        `  ✖ ${pkg.name}: configured directory ${pkg.dir} has no package.json; fix "dir" or remove the entry`
      );
      record(CONFIG, 'config', 'FAIL', `${pkg.alias}: ${pkg.dir} missing`);
    }
  }
  const present = selected.filter((pkg) => !missing.includes(pkg));
  const ready = present.filter((pkg) => pkg.status === 'ready');

  // Builds the packages that have a build target, so the packed lib/ is
  // current. Inside the Nx gate target, dependsOn has already built them.
  // GATE_SKIP_BUILD=1 skips this when the caller already built lib/ (the
  // Bitrise JS job, after _prepare_js). The pack step still reads that lib/.
  if (
    shouldBuildPackages(process.env, {
      ready: ready.length > 0,
      packOrExpo: wants('pack') || wants('expo'),
    })
  ) {
    heading('build');
    const status = run(
      'yarn',
      [
        'nx',
        'run-many',
        '-t',
        'build',
        '-p',
        ready.map((pkg) => pkg.name).join(','),
      ],
      { cwd: repoRoot }
    );
    if (status !== 0) {
      record(null, 'build', 'FAIL', `exit ${status}`);
      return finish();
    }
  }

  const parsed = wants('bridge') ? loadParsedFixtures(repoRoot) : null;
  const contracts = parsed ? familyIndex(parsed) : null;
  for (const pkg of present) {
    if (wants('spi')) spiStep(pkg);
    if (wants('pack')) packStep(pkg);
    if (pkg.status === 'shell') {
      for (const step of args.steps.filter((s) => !SHELL_STEPS.has(s))) {
        record(pkg, step, 'n/a', 'shell');
      }
      continue;
    }
    if (wants('bridge')) bridgeFamiliesStep(pkg, contracts);
  }

  if (ready.length && wants('bridge')) {
    heading(`bridge contract tier (${args.bridge.join(', ')})`);
    const status = run(
      'node',
      [
        'packages/bridge-contracts/scripts/test-bridge.mjs',
        `--only=${args.bridge.join(',')}`,
      ],
      { cwd: repoRoot }
    );
    record(
      null,
      'bridge tier',
      status === 0 ? 'PASS' : 'FAIL',
      args.bridge.join(',')
    );
  }

  if (ready.length && wants('coverage')) {
    heading('Jest coverage floors');
    const status = run(
      'node',
      ['tooling/test-harness/scripts/jest-coverage.mjs'],
      {
        cwd: repoRoot,
      }
    );
    record(
      null,
      'coverage',
      status === 0 ? 'PASS' : 'FAIL',
      'all workspace floors'
    );
  }

  if (wants('expo')) {
    for (const pkg of ready) {
      heading(`${pkg.alias}: Expo smoke build (${args.platforms.join(', ')})`);
      const { errors, notes } = await expoSmoke({
        pkg,
        allPackages: config.packages,
        platforms: args.platforms,
        sdk: args.expoSdk,
        keep: args.keepSmoke,
        verbose: args.verbose,
      });
      report(notes, '  note: ');
      for (const error of errors) console.error(`  ✖ ${error}`);
      record(
        pkg,
        'expo',
        errors.length ? 'FAIL' : 'PASS',
        args.platforms.join(',')
      );
    }
  }

  return finish();

  function finish() {
    heading('summary');
    for (const row of results) {
      console.log(
        `  ${row.pkg.padEnd(24)} ${row.step.padEnd(12)} ${row.status.padEnd(5)} ${row.detail}`
      );
    }
    const verdict = gateVerdict({
      results,
      selected,
      missing,
      skipped: skippedSteps(args),
    });
    for (const line of verdict.lines) console.log(line);
    process.exitCode = verdict.exitCode;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`✖ ${error.message}`);
    process.exitCode = 2;
  });
}
