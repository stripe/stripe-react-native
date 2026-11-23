import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { repoRoot, smokeDir } from '../checks/config.mjs';
import {
  expoSmoke,
  packagesToInstall,
  tarballFromNpmPackStdout,
} from '../checks/expo-smoke.mjs';

const destination = path.join('/tmp', 'pack');
const filename = 'stripe-react-native-0.0.0.tgz';
const info = 'ℹ [typescript] notice before the pack report\n';

test('packagesToInstall rejects a dependency that is still a shell', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-install-'));
  try {
    fs.mkdirSync(path.join(root, 'app'));
    fs.writeFileSync(
      path.join(root, 'app', 'package.json'),
      JSON.stringify({
        name: '@stripe/app',
        dependencies: { '@stripe/react-native-core': '0.0.0' },
      })
    );
    const app = { name: '@stripe/app', dir: 'app', status: 'ready' };
    const core = {
      name: '@stripe/react-native-core',
      dir: 'packages/core',
      status: 'shell',
    };
    assert.throws(
      () => packagesToInstall(app, [app, core], root),
      /@stripe\/app depends on @stripe\/react-native-core, which is still a shell/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an info line before a JSON pack report still yields the tarball', () => {
  const arrayReport = [{ filename, size: 12 }];
  const objectReport = {
    '@stripe/stripe-react-native': { filename, size: 12 },
  };
  assert.equal(
    tarballFromNpmPackStdout(
      `${info}${JSON.stringify(arrayReport)}`,
      destination
    ),
    path.join(destination, filename)
  );
  assert.equal(
    tarballFromNpmPackStdout(
      `${info}${JSON.stringify(objectReport)}`,
      destination
    ),
    path.join(destination, filename)
  );
});

test('pack output with no JSON document throws', () => {
  assert.throws(
    () =>
      tarballFromNpmPackStdout(
        'ℹ [typescript] notice\nthis is not json',
        destination
      ),
    /did not print a JSON report/
  );
});

test('a bracket that is not a complete JSON value throws', () => {
  assert.throws(
    () =>
      tarballFromNpmPackStdout(
        'ℹ [typescript] notice\n[{"filename":',
        destination
      ),
    SyntaxError
  );
});

const smokePkg = {
  name: '@stripe/stripe-react-native',
  dir: '.',
  status: 'ready',
  expo: { probe: 'probes/stripe-react-native.tsx' },
};

function workDirectory(notes) {
  const note = notes.find((line) => line.startsWith('work directory: '));
  assert.ok(note, 'notes name the work directory');
  return note.slice('work directory: '.length);
}

function scaffoldApp(_command, args, { cwd }) {
  if (!args.some((arg) => String(arg).includes('create-expo-app@'))) return;
  const appDir = path.join(cwd, 'StripeSmoke');
  fs.mkdirSync(path.join(appDir, 'android'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'ios'), { recursive: true });
  fs.writeFileSync(
    path.join(appDir, 'app.json'),
    JSON.stringify({ expo: { name: 'Template' } })
  );
}

function writeArtifact(command, _args, { cwd }, { apk, bundle }) {
  if (command === './gradlew' && apk) {
    const file = path.join(
      cwd,
      'app/build/outputs/apk/release/app-release.apk'
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'apk');
  }
  if (command === 'xcodebuild' && bundle) {
    const workDir = path.dirname(path.dirname(cwd));
    const file = path.join(
      workDir,
      'DerivedData/Build/Products/Release-iphonesimulator/StripeSmoke.app/main.jsbundle'
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'bundle');
  }
}

async function runSmoke({
  platforms,
  keep = false,
  apk = false,
  bundle = false,
}) {
  return expoSmoke({
    pkg: smokePkg,
    allPackages: [smokePkg],
    platforms,
    sdk: '55',
    keep,
    verbose: false,
    pack: () => 'package.tgz',
    runCommand: async (command, args, options) => {
      scaffoldApp(command, args, options);
      writeArtifact(command, args, options, { apk, bundle });
      return 0;
    },
  });
}

test('a package with no expo.probe fails before packing or building', async () => {
  const result = await expoSmoke({
    pkg: { name: '@stripe/stripe-react-native', expo: null },
    allPackages: [],
    platforms: ['ios', 'android'],
    keep: false,
    verbose: false,
    pack: () => {
      throw new Error('pack should not run');
    },
    runCommand: async () => {
      throw new Error('build steps should not run');
    },
  });
  assert.deepEqual(result, {
    errors: [
      '@stripe/stripe-react-native has no "expo.probe" in the gate config',
    ],
    notes: [],
  });
});

async function failSmokeAt(kind, platforms = ['ios']) {
  const commands = [];
  const { errors, notes } = await expoSmoke({
    pkg: smokePkg,
    allPackages: [smokePkg],
    platforms,
    sdk: '55',
    keep: false,
    verbose: false,
    pack: () => 'package.tgz',
    runCommand: async (command, args, options) => {
      commands.push(command === 'npx' ? args.slice(0, 2).join(' ') : command);
      if (kind !== 'create') scaffoldApp(command, args, options);
      if (
        kind === 'create' &&
        args.some((arg) => String(arg).includes('create-expo-app@'))
      ) {
        return 1;
      }
      if (kind === 'install' && command === 'npm') return 1;
      if (kind === 'build-properties' && args.includes('expo-build-properties'))
        return 1;
      if (kind === 'prebuild' && args.includes('prebuild')) return 1;
      if (kind === 'android-build' && command === './gradlew') return 1;
      if (kind === 'ios-build' && command === 'xcodebuild') return 1;
      return 0;
    },
  });
  return { errors, notes, commands };
}

test('a failed create, install, or prebuild names that step', async () => {
  const created = await failSmokeAt('create');
  const createdDir = workDirectory(created.notes);
  try {
    assert.equal(created.errors.length, 1);
    assert.match(created.errors[0], /Create the Expo SDK 55 app failed/);
  } finally {
    fs.rmSync(createdDir, { recursive: true, force: true });
  }

  const installed = await failSmokeAt('install');
  const installedDir = workDirectory(installed.notes);
  try {
    assert.equal(installed.errors.length, 1);
    assert.match(
      installed.errors[0],
      /Install the template dependencies and the packed package failed/
    );
  } finally {
    fs.rmSync(installedDir, { recursive: true, force: true });
  }

  const prebuilt = await failSmokeAt('prebuild');
  const prebuiltDir = workDirectory(prebuilt.notes);
  try {
    assert.equal(prebuilt.errors.length, 1);
    assert.match(prebuilt.errors[0], /expo prebuild \(ios\) failed/);
  } finally {
    fs.rmSync(prebuiltDir, { recursive: true, force: true });
  }
});

test('a failed expo-build-properties install names that step and stops before prebuild', async () => {
  const { errors, notes, commands } = await failSmokeAt('build-properties');
  const workDir = workDirectory(notes);
  try {
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /^Install expo-build-properties failed; see .*\/logs\/install\.log$/
    );
    assert.deepEqual(commands.slice(-2), ['npm', 'expo install']);
    assert.equal(fs.existsSync(workDir), true);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('a failed Android or iOS build names that step and reports no missing artifact', async () => {
  const android = await failSmokeAt('android-build', ['android']);
  const androidDir = workDirectory(android.notes);
  try {
    assert.deepEqual(android.errors, [
      `Android release build failed; see ${androidDir}/logs/android-build.log`,
    ]);
  } finally {
    fs.rmSync(androidDir, { recursive: true, force: true });
  }

  const ios = await failSmokeAt('ios-build');
  const iosDir = workDirectory(ios.notes);
  try {
    assert.deepEqual(ios.errors, [
      `iOS Release build (simulator) failed; see ${iosDir}/logs/ios-build.log`,
    ]);
  } finally {
    fs.rmSync(iosDir, { recursive: true, force: true });
  }
});

test('a failed Android build still runs the iOS build', async () => {
  const { errors, notes, commands } = await failSmokeAt('android-build', [
    'android',
    'ios',
  ]);
  const workDir = workDirectory(notes);
  try {
    assert.deepEqual(commands.slice(-2), ['./gradlew', 'xcodebuild']);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /^Android release build failed/);
    assert.match(
      errors[1],
      /iOS build passed but .*\/main\.jsbundle is missing/
    );
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('expo smoke configures the app, installs the probe, and patches the native projects', async () => {
  const pkg = {
    ...smokePkg,
    expo: { ...smokePkg.expo, plugin: 'probe-plugin' },
  };
  const calls = [];
  const previousYarn = process.env.YARN_SMOKE_PROBE;
  process.env.YARN_SMOKE_PROBE = '1';
  let result;
  try {
    result = await expoSmoke({
      pkg,
      allPackages: [pkg],
      platforms: ['android', 'ios'],
      sdk: '55',
      keep: true,
      verbose: false,
      pack: () => 'package.tgz',
      runCommand: async (command, args, options) => {
        calls.push({ command, args, env: options.env });
        if (args.some((arg) => String(arg).includes('create-expo-app@'))) {
          const appDir = path.join(options.cwd, 'StripeSmoke');
          fs.mkdirSync(appDir, { recursive: true });
          fs.writeFileSync(
            path.join(appDir, 'app.json'),
            JSON.stringify({
              expo: {
                name: 'Template',
                web: { output: 'static' },
                plugins: [['expo-build-properties', { ios: {} }]],
              },
            })
          );
          fs.writeFileSync(path.join(appDir, 'App.js'), 'template');
          fs.writeFileSync(path.join(appDir, 'index.js'), 'entry');
          fs.mkdirSync(path.join(appDir, 'android'));
          fs.writeFileSync(
            path.join(appDir, 'android/gradle.properties'),
            'org.gradle.jvmargs=-Xmx2g\nandroid.useAndroidX=true\n'
          );
          const fmt = path.join(appDir, 'ios/Pods/fmt/include/fmt/base.h');
          fs.mkdirSync(path.dirname(fmt), { recursive: true });
          fs.writeFileSync(fmt, '#  define FMT_USE_CONSTEVAL 1\n');
          const xcconfig = path.join(
            appDir,
            'ios/Pods/Target Support Files/Pod/Pod.release.xcconfig'
          );
          fs.mkdirSync(path.dirname(xcconfig), { recursive: true });
          fs.writeFileSync(xcconfig, 'OTHER = 1\n');
        }
        writeArtifact(command, args, options, { apk: true, bundle: true });
        return 0;
      },
    });
  } finally {
    if (previousYarn === undefined) delete process.env.YARN_SMOKE_PROBE;
    else process.env.YARN_SMOKE_PROBE = previousYarn;
  }
  const workDir = workDirectory(result.notes);
  const appDir = path.join(workDir, 'StripeSmoke');
  try {
    assert.deepEqual(result.errors, []);
    assert.ok(
      result.notes.includes(
        'web.output: template had static; smoke app uses none'
      )
    );

    const prebuild = calls.find(({ args }) => args.includes('prebuild'));
    assert.deepEqual(prebuild.args, [
      'expo',
      'prebuild',
      '--clean',
      '--platform',
      'all',
    ]);
    assert.deepEqual(calls.find(({ command }) => command === 'npm').args, [
      'install',
      'package.tgz',
    ]);
    for (const { env } of calls) {
      assert.equal(env.EXPO_NO_TELEMETRY, '1');
      assert.equal(env.CI, '1');
      assert.equal(env.YARN_SMOKE_PROBE, undefined);
    }

    const { expo } = JSON.parse(
      fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')
    );
    assert.equal(expo.name, 'StripeSmoke');
    assert.equal(expo.web.output, undefined);
    assert.deepEqual(expo.plugins, [
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'dynamic', deploymentTarget: '16.0' },
          android: { minSdkVersion: 24 },
        },
      ],
      'probe-plugin',
    ]);

    assert.equal(fs.existsSync(path.join(appDir, 'App.js')), false);
    assert.equal(
      fs.readFileSync(path.join(appDir, 'index.js'), 'utf8'),
      'entry'
    );
    assert.equal(
      fs.readFileSync(path.join(appDir, 'App.tsx'), 'utf8'),
      fs.readFileSync(path.join(smokeDir, smokePkg.expo.probe), 'utf8')
    );

    assert.equal(
      fs.readFileSync(path.join(appDir, 'android/gradle.properties'), 'utf8'),
      'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n'
    );
    assert.equal(
      fs.readFileSync(
        path.join(appDir, 'ios/Pods/fmt/include/fmt/base.h'),
        'utf8'
      ),
      '# define FMT_USE_CONSTEVAL 0\n'
    );
    assert.equal(
      fs.readFileSync(
        path.join(
          appDir,
          'ios/Pods/Target Support Files/Pod/Pod.release.xcconfig'
        ),
        'utf8'
      ),
      'OTHER = 1\n\nFRAMEWORK_SEARCH_PATHS = $(inherited) $(SDKROOT)/System/Library/SubFrameworks\n'
    );
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('expo smoke installs a tarball the pack step already built', async () => {
  const tarball = path.join(os.tmpdir(), 'already-packed.tgz');
  let packed = false;
  const { errors, notes } = await expoSmoke({
    pkg: smokePkg,
    allPackages: [smokePkg],
    platforms: ['ios'],
    sdk: '55',
    keep: false,
    verbose: false,
    packedTarballs: new Map([[path.resolve(repoRoot, smokePkg.dir), tarball]]),
    pack: () => {
      packed = true;
      return 'should-not-pack.tgz';
    },
    runCommand: async (command, args, options) => {
      scaffoldApp(command, args, options);
      if (command === 'npm' && args[0] === 'install') {
        assert.equal(args.includes(tarball), true);
        return 1;
      }
      return 0;
    },
  });
  const workDir = workDirectory(notes);
  try {
    assert.equal(packed, false);
    assert.match(
      errors[0],
      /Install the template dependencies and the packed package failed/
    );
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('a passing Android build with no APK fails and keeps the work directory', async () => {
  const { errors, notes } = await runSmoke({ platforms: ['android'] });
  const workDir = workDirectory(notes);
  try {
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /Android build passed but .*\/app-release\.apk is missing/
    );
    assert.equal(fs.existsSync(workDir), true);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('a passing iOS build with no main.jsbundle fails and keeps the work directory', async () => {
  const { errors, notes } = await runSmoke({ platforms: ['ios'] });
  const workDir = workDirectory(notes);
  try {
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /iOS build passed but .*\/main\.jsbundle is missing/
    );
    assert.equal(fs.existsSync(workDir), true);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('a smoke run that passes deletes the work directory unless keep is set', async () => {
  const removed = await runSmoke({
    platforms: ['ios', 'android'],
    apk: true,
    bundle: true,
  });
  const removedDir = workDirectory(removed.notes);
  assert.deepEqual(removed.errors, []);
  assert.ok(removed.notes.some((note) => note.includes('app-release.apk')));
  assert.ok(removed.notes.some((note) => note.includes('main.jsbundle')));
  assert.equal(fs.existsSync(removedDir), false);

  const kept = await runSmoke({
    platforms: ['android'],
    keep: true,
    apk: true,
  });
  const keptDir = workDirectory(kept.notes);
  try {
    assert.deepEqual(kept.errors, []);
    assert.equal(fs.existsSync(keptDir), true);
  } finally {
    fs.rmSync(keptDir, { recursive: true, force: true });
  }
});
