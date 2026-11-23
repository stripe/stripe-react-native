import { PLATFORMS } from './config.mjs';

export const STEPS = ['spi', 'pack', 'bridge', 'coverage', 'expo'];
export const BRIDGE_PLATFORMS = ['js', 'ios', 'android'];

const CHECK_SCRIPT = 'packages/bridge-contracts/scripts/check.mjs';
const TEST_BRIDGE_SCRIPT = 'packages/bridge-contracts/scripts/test-bridge.mjs';

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

/**
 * Commands for the bridge contract tier.
 * `js` runs the fixture check once and does not start Jest.
 * `ios` and `android` stay on the native loaders.
 */
export function bridgeTierCommands(bridge) {
  const commands = [];
  if (bridge.includes('js')) {
    commands.push(['node', [CHECK_SCRIPT]]);
  }
  const native = bridge.filter((platform) => platform !== 'js');
  if (native.length) {
    commands.push(['node', [TEST_BRIDGE_SCRIPT, `--only=${native.join(',')}`]]);
  }
  return commands;
}
