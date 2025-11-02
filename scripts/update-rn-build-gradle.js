#!/usr/bin/env node

/**
 * Patch a generated React Native project's `android/build.gradle` to ensure
 * Kotlin plugin compatibility for older RN versions.
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = process.argv[2];
const rnVersion = process.argv[3];

const parts = rnVersion.split('.');
const minor = Number.parseInt(parts[1], 10);
const needsPatch = minor <= 77;

if (!needsPatch) {
  console.log(
    `React Native ${rnVersion} does not require Kotlin build.gradle patch. Skipping.`
  );
  process.exit(0);
}

const resolvedPath = path.resolve(buildGradlePath);
let contents = fs.readFileSync(resolvedPath, 'utf8');

contents = contents.replace(
  /(targetSdkVersion\s*=\s*'[^']*')/,
  `$1\nkotlinVersion = '2.0.21'`
);

contents = contents.replace(
  /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin[^'"]*['"]\)/g,
  'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
);

fs.writeFileSync(resolvedPath, contents, 'utf8');
console.log(`Updated ${resolvedPath}`);
