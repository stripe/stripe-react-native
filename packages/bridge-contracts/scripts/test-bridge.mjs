#!/usr/bin/env node
// Runs the bridge contract tier: the fixture checks, the Jest contract test,
// and the XCTest and Robolectric fixture loaders.
//
//   yarn test:bridge                  everything
//   yarn test:bridge --only=js        checks and Jest only (no native builds)
//   yarn test:bridge --only=ios,android
//   yarn test:bridge --only=ios --families=payment-sheet,embedded
//
// iOS needs `yarn pods` first. IOS_SIMULATOR works as it does for
// `yarn test:unit:ios`. `--families` limits the native loaders to those
// fixture directories. Omit it to load every fixture.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageDir, repoRoot } from './lib.mjs';

const STEPS = ['js', 'ios', 'android'];

export function parseBridgeArgs(argv) {
  const onlyArg = argv.find((arg) => arg.startsWith('--only='));
  const familiesArg = argv.find((arg) => arg.startsWith('--families='));
  const selected = onlyArg ? onlyArg.slice('--only='.length).split(',') : STEPS;
  const unknown = selected.filter((step) => !STEPS.includes(step));
  const families = familiesArg
    ? familiesArg.slice('--families='.length).split(',').filter(Boolean)
    : null;
  return { selected, unknown, families };
}

/**
 * Native loader invocations. `families` narrows which fixture directories
 * the XCTest and Robolectric loaders read. `null` loads every fixture.
 */
export function nativeLoaderPlan(families) {
  const familyList = families?.length ? families.join(',') : '';
  const iosArgs = [
    'test',
    '-workspace',
    'example/ios/example.xcworkspace',
    '-destination',
    `platform=iOS Simulator,name=${process.env.IOS_SIMULATOR || 'iPhone 16 Pro Max'}`,
    '-scheme',
    'ReactTestApp',
    '-only-testing:ReactTestAppTests/BridgeContractTests',
  ];
  const androidArgs = [
    // The library sources reach Gradle through example/node_modules, a
    // symlink that file watching and Kotlin incremental builds miss.
    '--no-watch-fs',
    '-Pkotlin.incremental=false',
    ':stripe_stripe-react-native:testDebugUnitTest',
    '--tests',
    'com.reactnativestripesdk.bridgecontracts.*',
  ];
  if (familyList) {
    androidArgs.push(`-PbridgeContracts.families=${familyList}`);
  }
  return {
    ios: {
      args: iosArgs,
      env: familyList
        ? { TEST_RUNNER_BRIDGE_FIXTURE_FAMILIES: familyList }
        : {},
    },
    android: { args: androidArgs },
  };
}

function run(title, command, args, cwd, extraEnv) {
  console.log(`\n▶ ${title}\n  ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  });
  if (result.status !== 0) {
    console.error(
      `✖ ${title} failed (exit ${result.status ?? result.signal})`
    );
    process.exit(result.status ?? 1);
  }
}

export function main(argv = process.argv) {
  const { selected, unknown, families } = parseBridgeArgs(argv);
  if (unknown.length) {
    console.error(
      `Unknown step(s): ${unknown.join(', ')}. Use ${STEPS.join(', ')}.`
    );
    process.exit(2);
  }
  if (families) {
    for (const family of families) {
      const dir = path.join(packageDir, 'fixtures', family);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        console.error(`Unknown fixture family "${family}".`);
        process.exit(2);
      }
    }
  }

  if (selected.includes('js')) {
    run(
      'Fixture checks',
      'node',
      [path.join(packageDir, 'scripts/check.mjs')],
      repoRoot
    );
    run(
      'Jest contract test',
      'yarn',
      ['jest', 'src/types/__tests__/bridgeContracts.test.tsx'],
      repoRoot
    );
  }

  const loaders = nativeLoaderPlan(families);
  if (selected.includes('ios')) {
    run(
      'XCTest fixture loader',
      'xcodebuild',
      loaders.ios.args,
      repoRoot,
      loaders.ios.env
    );
  }

  if (selected.includes('android')) {
    run(
      'Robolectric fixture loader',
      './gradlew',
      loaders.android.args,
      path.join(repoRoot, 'example/android')
    );
  }

  console.log(`\n✔ Bridge contract tier passed (${selected.join(', ')})`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv);
}
