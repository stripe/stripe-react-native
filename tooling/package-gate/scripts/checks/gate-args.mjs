import { PLATFORMS } from './config.mjs';

export const STEPS = ['spi', 'pack', 'bridge', 'coverage', 'expo'];
export const BRIDGE_PLATFORMS = ['js', 'ios', 'android'];

const CHECK_SCRIPT = 'packages/bridge-contracts/scripts/check.mjs';
const TEST_BRIDGE_SCRIPT = 'packages/bridge-contracts/scripts/test-bridge.mjs';
const COVERAGE_SCRIPT = 'tooling/test-harness/scripts/jest-coverage.mjs';

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
    else if (flag === '--only') {
      args.steps = parseList(value, STEPS, flag);
      if (!args.steps.length) {
        throw new Error(`--only: expected one of ${STEPS.join(', ')}`);
      }
    } else if (flag === '--skip') {
      const skip = parseList(value, STEPS, flag);
      args.steps = args.steps.filter((step) => !skip.includes(step));
    } else if (flag === '--bridge') {
      args.bridge = parseList(value, BRIDGE_PLATFORMS, flag);
      if (!args.bridge.length) {
        throw new Error(
          `--bridge: expected one of ${BRIDGE_PLATFORMS.join(', ')}`
        );
      }
    } else if (flag === '--platforms') {
      args.platforms = parseList(value, PLATFORMS, flag);
      if (!args.platforms.length) {
        throw new Error(`--platforms: expected one of ${PLATFORMS.join(', ')}`);
      }
    } else if (flag === '--expo-sdk') args.expoSdk = value;
    else if (flag === '--keep-smoke') args.keepSmoke = true;
    else if (flag === '--verbose') args.verbose = true;
    else if (flag.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else args.queries.push(arg);
  }
  return args;
}

/**
 * Commands for the bridge contract tier.
 * `js` runs the fixture check once and does not start Jest.
 * `ios` and `android` stay on the native loaders.
 * `families` undefined checks every fixture. An array limits the JS
 * check and the native loaders to those families. An empty array
 * starts neither.
 */
export function bridgeTierCommands(bridge, families) {
  const commands = [];
  if (bridge.includes('js')) {
    if (!Array.isArray(families)) {
      commands.push(['node', [CHECK_SCRIPT]]);
    } else if (families.length) {
      commands.push([
        'node',
        [CHECK_SCRIPT, `--families=${families.join(',')}`],
      ]);
    }
  }
  const native = bridge.filter((platform) => platform !== 'js');
  if (native.length && !(Array.isArray(families) && families.length === 0)) {
    const commandArgs = [TEST_BRIDGE_SCRIPT, `--only=${native.join(',')}`];
    if (Array.isArray(families)) {
      commandArgs.push(`--families=${families.join(',')}`);
    }
    commands.push(['node', commandArgs]);
  }
  return commands;
}

/**
 * Fixture families for a package run. A package with `families: "*"` keeps
 * the full native tier. Otherwise the result is the union of the lists.
 */
export function familiesForPackages(packages) {
  if (packages.some((pkg) => pkg.families === '*')) return undefined;
  const families = [];
  for (const pkg of packages) {
    for (const family of Array.isArray(pkg.families) ? pkg.families : []) {
      if (!families.includes(family)) families.push(family);
    }
  }
  return families;
}

/** Unfiltered when `packageNames` is omitted. Otherwise one `--package` list. */
export function coverageCommand(packageNames) {
  const args = [COVERAGE_SCRIPT];
  if (packageNames?.length) {
    args.push(`--package=${packageNames.join(',')}`);
  }
  return ['node', args];
}

/** What a gate run spawns for the shared coverage and bridge-tier steps. */
export function sharedTierPlan({ all, bridge, packages }) {
  return {
    bridge: bridgeTierCommands(
      bridge,
      all ? undefined : familiesForPackages(packages)
    ),
    coverage: coverageCommand(
      all ? undefined : packages.map((pkg) => pkg.name)
    ),
  };
}
