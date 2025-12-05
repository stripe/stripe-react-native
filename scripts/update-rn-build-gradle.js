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
const needsPatch = minor <= 76;

if (!needsPatch) {
  console.log(
    `React Native ${rnVersion} does not require Kotlin build.gradle patch. Skipping.`
  );
  process.exit(0);
}

const resolvedPath = path.resolve(buildGradlePath);
const contents = fs.readFileSync(resolvedPath, 'utf8');

let updatedContents = contents.replace(
  /kotlinVersion.*/,
  `kotlinVersion = "2.0.21"`
);

updatedContents = updatedContents.replace(
  'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
  'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
);

if (contents === updatedContents) {
  throw new Error('Failed to apply Kotlin version patch to build.gradle');
}

fs.writeFileSync(resolvedPath, updatedContents, 'utf8');
console.log(`Updated ${resolvedPath}`);
