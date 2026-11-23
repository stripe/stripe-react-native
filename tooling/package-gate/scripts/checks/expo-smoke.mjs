import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PLATFORMS, readJson, repoRoot, smokeDir } from './config.mjs';
import { runLogged } from './run.mjs';

export function smokeSettings(config, sdkOverride) {
  const expoSdk = String(sdkOverride ?? config.expoSdk);
  const profile = config.sdkProfiles?.[expoSdk];
  if (!profile) {
    throw new Error(
      `examples/expo-smoke/smoke.config.json has no sdkProfiles entry for Expo SDK ${expoSdk}`
    );
  }
  return { ...config, expoSdk, ...profile };
}

export function configureAppJson(appJson, settings, plugin) {
  const expo = appJson.expo ?? (appJson.expo = {});
  expo.name = settings.appName;
  expo.slug = settings.appName.toLowerCase();
  expo.ios = { ...expo.ios, bundleIdentifier: settings.applicationId };
  expo.android = { ...expo.android, package: settings.applicationId };
  const web = expo.web ?? {};
  const templateWebOutput = web.output ?? null;
  if (settings.webOutput === 'remove') {
    delete web.output;
  } else {
    web.output = settings.webOutput;
  }
  expo.web = web;
  expo.plugins = [
    ...(expo.plugins ?? []).filter(
      (entry) =>
        (Array.isArray(entry) ? entry[0] : entry) !== 'expo-build-properties'
    ),
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'dynamic',
          deploymentTarget: settings.iosDeploymentTarget,
        },
        android: { minSdkVersion: settings.androidMinSdk },
      },
    ],
    ...(plugin ? [plugin] : []),
  ];
  return { appJson, templateWebOutput };
}

function npmPack(dir, destination) {
  const result = spawnSync(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', destination],
    { cwd: dir, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(`npm pack failed in ${dir}:\n${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout);
  const report = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  return path.join(destination, report.filename);
}

export function packagesToInstall(pkg, allPackages, root = repoRoot) {
  const byName = new Map(allPackages.map((p) => [p.name, p]));
  const ordered = [];
  const visit = (current) => {
    if (ordered.includes(current)) return;
    const manifest = readJson(path.join(root, current.dir, 'package.json'));
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        const dep = byName.get(name);
        if (!dep) continue;
        if (dep.status !== 'ready') {
          throw new Error(
            `${current.name} depends on ${dep.name}, which is still a shell`
          );
        }
        visit(dep);
      }
    }
    ordered.push(current);
  };
  visit(pkg);
  return ordered;
}

// Xcode 27 workarounds. No-ops on toolchains that don't need them.
function patchIosPods(iosDir) {
  const fmtBase = path.join(iosDir, 'Pods/fmt/include/fmt/base.h');
  if (fs.existsSync(fmtBase)) {
    const text = fs.readFileSync(fmtBase, 'utf8');
    fs.writeFileSync(
      fmtBase,
      text.replace(
        /#\s*define FMT_USE_CONSTEVAL 1/g,
        '# define FMT_USE_CONSTEVAL 0'
      )
    );
  }
  const supportDir = path.join(iosDir, 'Pods/Target Support Files');
  if (!fs.existsSync(supportDir)) return;
  for (const file of fs
    .readdirSync(supportDir, { recursive: true })
    .map(String)) {
    if (!file.endsWith('.xcconfig')) continue;
    const full = path.join(supportDir, file);
    const text = fs.readFileSync(full, 'utf8');
    if (!text.includes('System/Library/SubFrameworks')) {
      fs.appendFileSync(
        full,
        '\nFRAMEWORK_SEARCH_PATHS = $(inherited) $(SDKROOT)/System/Library/SubFrameworks\n'
      );
    }
  }
}

function raiseGradleHeap(androidDir) {
  const file = path.join(androidDir, 'gradle.properties');
  const line =
    'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8';
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  fs.writeFileSync(
    file,
    /^org\.gradle\.jvmargs=.*$/m.test(text)
      ? text.replace(/^org\.gradle\.jvmargs=.*$/m, line)
      : `${text}\n${line}\n`
  );
}

/**
 * Builds a throwaway Expo app from the template, installs the packed
 * package, runs `expo prebuild`, and builds iOS (Release, simulator) and
 * Android (assembleRelease). Release builds bundle the JS, so an import that
 * fails to bundle fails the build. Nothing is launched.
 */
export async function expoSmoke({
  pkg,
  allPackages,
  platforms,
  sdk,
  keep,
  verbose,
  runCommand = runLogged,
  pack = npmPack,
}) {
  if (!pkg.expo?.probe) {
    return {
      errors: [`${pkg.name} has no "expo.probe" in the gate config`],
      notes: [],
    };
  }
  const settings = smokeSettings(
    readJson(path.join(smokeDir, 'smoke.config.json')),
    sdk
  );
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-expo-smoke-'));
  const logsDir = path.join(workDir, 'logs');
  const packDir = path.join(workDir, 'pack');
  fs.mkdirSync(logsDir);
  fs.mkdirSync(packDir);
  const appDir = path.join(workDir, settings.appName);
  // The app installs with npm. Yarn's npm_config_* variables would make
  // create-expo-app and `expo install` pick Yarn inside this Yarn workspace.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(npm_|YARN_|BERRY_)/i.test(key)
    )
  );
  Object.assign(env, { EXPO_NO_TELEMETRY: '1', CI: '1' });
  const errors = [];
  const notes = [`work directory: ${workDir}`];
  const step = async (title, command, args, cwd, logName) => {
    console.log(`\n  ▶ ${title}`);
    const status = await runCommand(command, args, {
      cwd,
      env,
      logFile: path.join(logsDir, `${logName}.log`),
      verbose,
    });
    if (status !== 0)
      errors.push(`${title} failed; see ${logsDir}/${logName}.log`);
    return status === 0;
  };

  try {
    const tarballs = packagesToInstall(pkg, allPackages).map((p) =>
      pack(path.join(repoRoot, p.dir), packDir)
    );
    notes.push(`Expo SDK ${settings.expoSdk}, template ${settings.template}`);

    const created = await step(
      `Create the Expo SDK ${settings.expoSdk} app`,
      'npx',
      [
        '--yes',
        'create-expo-app@latest',
        settings.appName,
        '--template',
        `${settings.template}@sdk-${settings.expoSdk}`,
        '--yes',
        '--no-install',
      ],
      workDir,
      'create'
    );
    if (!created) return { errors, notes };

    if (
      !(await step(
        'Install the template dependencies and the packed package',
        'npm',
        ['install', ...tarballs],
        appDir,
        'install'
      )) ||
      !(await step(
        'Install expo-build-properties',
        'npx',
        ['expo', 'install', 'expo-build-properties'],
        appDir,
        'install'
      ))
    ) {
      return { errors, notes };
    }

    const appJsonPath = path.join(appDir, 'app.json');
    const { appJson, templateWebOutput } = configureAppJson(
      readJson(appJsonPath),
      settings,
      pkg.expo.plugin
    );
    fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
    notes.push(
      `web.output: template had ${templateWebOutput ?? 'none'}; smoke app uses ${appJson.expo.web.output ?? 'none'}`
    );
    // The template's entry screen may use another extension (App.js);
    // remove it so the probe is the only module `./App` resolves to.
    const entry = path.parse(settings.entryFile);
    const entryDir = path.join(appDir, entry.dir);
    for (const file of fs.readdirSync(entryDir)) {
      if (
        /\.[cm]?[jt]sx?$/.test(file) &&
        path.parse(file).name === entry.name
      ) {
        fs.rmSync(path.join(entryDir, file));
      }
    }
    fs.copyFileSync(
      path.join(smokeDir, pkg.expo.probe),
      path.join(appDir, settings.entryFile)
    );

    const prebuilt = await step(
      `expo prebuild (${platforms.join(', ')})`,
      'npx',
      [
        'expo',
        'prebuild',
        '--clean',
        '--platform',
        platforms.length === 1 ? platforms[0] : 'all',
      ],
      appDir,
      'prebuild'
    );
    if (!prebuilt) return { errors, notes };

    for (const platform of platforms) {
      if (platform === 'android') {
        const androidDir = path.join(appDir, 'android');
        raiseGradleHeap(androidDir);
        const built = await step(
          'Android release build',
          './gradlew',
          [
            'assembleRelease',
            `-PreactNativeArchitectures=${settings.androidArchitectures}`,
          ],
          androidDir,
          'android-build'
        );
        const apk = path.join(
          androidDir,
          'app/build/outputs/apk/release/app-release.apk'
        );
        if (built && !fs.existsSync(apk)) {
          errors.push(`Android build passed but ${apk} is missing`);
        } else if (built) {
          notes.push(`Android: ${path.relative(workDir, apk)}`);
        }
      } else {
        const iosDir = path.join(appDir, 'ios');
        patchIosPods(iosDir);
        const derivedData = path.join(workDir, 'DerivedData');
        const scheme = settings.appName;
        const built = await step(
          'iOS Release build (simulator)',
          'xcodebuild',
          [
            '-workspace',
            `${scheme}.xcworkspace`,
            '-scheme',
            scheme,
            '-configuration',
            'Release',
            '-destination',
            'generic/platform=iOS Simulator',
            '-derivedDataPath',
            derivedData,
            'CODE_SIGNING_ALLOWED=NO',
            'EXCLUDED_ARCHS=x86_64',
            'build',
          ],
          iosDir,
          'ios-build'
        );
        const app = path.join(
          derivedData,
          `Build/Products/Release-iphonesimulator/${scheme}.app`
        );
        if (built && !fs.existsSync(path.join(app, 'main.jsbundle'))) {
          errors.push(`iOS build passed but ${app}/main.jsbundle is missing`);
        } else if (built) {
          notes.push(
            `iOS: ${path.relative(workDir, app)} (with main.jsbundle)`
          );
        }
      }
    }
    return { errors, notes };
  } finally {
    if (keep || errors.length > 0) {
      console.log(`\n  Smoke app kept at ${workDir}`);
    } else {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }
}
