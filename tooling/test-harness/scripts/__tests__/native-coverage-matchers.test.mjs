import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const harnessDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const repoRoot = path.resolve(harnessDir, '../..');
const require = createRequire(path.join(harnessDir, 'package.json'));

function readRubyStringArray(source, assignmentName) {
  const pattern = new RegExp(
    `${assignmentName}\\s*=\\s*\\[([^\\]]*)\\]`,
    'm'
  );
  const match = source.match(pattern);
  assert.ok(match, `expected ${assignmentName} = [...]`);
  const values = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(values.length > 0, `expected string entries in ${assignmentName}`);
  return values;
}

function readGradleStringArray(source, assignmentName) {
  const pattern = new RegExp(
    `${assignmentName}\\s*=\\s*\\[([^\\]]*)\\]`,
    'm'
  );
  const match = source.match(pattern);
  assert.ok(match, `expected ${assignmentName} = [...]`);
  const values = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(values.length > 0, `expected string entries in ${assignmentName}`);
  return values;
}

test('native coverage matchers align with the SDK pod name and Android namespace', () => {
  const podspec = fs.readFileSync(
    path.join(repoRoot, 'stripe-react-native.podspec'),
    'utf8'
  );
  const podName = podspec.match(/s\.name\s*=\s*'([^']+)'/)?.[1];
  assert.ok(podName, 'expected s.name in stripe-react-native.podspec');

  const androidGradle = fs.readFileSync(
    path.join(repoRoot, 'android/build.gradle'),
    'utf8'
  );
  const namespace = androidGradle.match(/namespace\s+"([^"]+)"/)?.[1];
  assert.ok(namespace, 'expected namespace in android/build.gradle');
  const jacocoPackage = namespace.replaceAll('.', '/');

  const podfile = fs.readFileSync(
    path.join(harnessDir, 'ios/Podfile'),
    'utf8'
  );
  const coveragePrefixes = readRubyStringArray(podfile, 'coverage_prefixes');
  const frameworkPrefix = podName.replaceAll('-', '_');

  const harnessAndroidGradle = fs.readFileSync(
    path.join(harnessDir, 'android/build.gradle'),
    'utf8'
  );
  const libraryMatchers = readGradleStringArray(
    harnessAndroidGradle,
    'ext\\.coverageLibraryProjectMatchers'
  );

  const configPath = path.join(harnessDir, 'react-native-coverage.config.js');
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);

  assert.ok(
    coveragePrefixes.includes(podName),
    `Podfile coverage_prefixes must include pod name ${podName}`
  );
  assert.ok(
    coveragePrefixes.includes(frameworkPrefix),
    `Podfile coverage_prefixes must include framework prefix ${frameworkPrefix}`
  );
  assert.deepEqual(
    libraryMatchers,
    [podName],
    'Gradle coverageLibraryProjectMatchers must name the SDK pod'
  );
  assert.deepEqual(
    config.ios.frameworkNamePrefixes,
    [frameworkPrefix],
    'react-native-coverage ios.frameworkNamePrefixes must match the framework prefix'
  );
  assert.deepEqual(
    config.android.libraryProjectMatchers,
    [podName],
    'react-native-coverage android.libraryProjectMatchers must name the SDK pod'
  );
  assert.ok(
    config.assert.jacocoPackageIncludes.includes(jacocoPackage),
    `assert.jacocoPackageIncludes must include ${jacocoPackage}`
  );
});
