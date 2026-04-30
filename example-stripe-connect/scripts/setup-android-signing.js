#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SIGNING_DIR = path.join(ROOT_DIR, '.signing');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const BUILD_GRADLE = path.join(ANDROID_DIR, 'app', 'build.gradle');
const GITIGNORE = path.join(ANDROID_DIR, '.gitignore');

console.log('🔐 Setting up Android release signing...\n');

// Check if signing directory exists
if (!fs.existsSync(SIGNING_DIR)) {
  console.error('❌ Error: .signing directory not found.');
  console.error(
    '   Make sure you have .signing/upload-keystore.jks and .signing/keystore.properties'
  );
  process.exit(1);
}

// Check if android directory exists
if (!fs.existsSync(ANDROID_DIR)) {
  console.error('❌ Error: android directory not found.');
  console.error(
    '   Run "expo prebuild" first to generate the android directory.'
  );
  process.exit(1);
}

// Copy keystore files
console.log('📋 Copying keystore files...');
const keystoreFile = path.join(SIGNING_DIR, 'upload-keystore.jks');
const keystoreProps = path.join(SIGNING_DIR, 'keystore.properties');

if (!fs.existsSync(keystoreFile) || !fs.existsSync(keystoreProps)) {
  console.error('❌ Error: Missing keystore files in .signing directory');
  console.error('   Expected: upload-keystore.jks and keystore.properties');
  process.exit(1);
}

fs.copyFileSync(keystoreFile, path.join(ANDROID_DIR, 'upload-keystore.jks'));
fs.copyFileSync(keystoreProps, path.join(ANDROID_DIR, 'keystore.properties'));
console.log('   ✓ Copied upload-keystore.jks');
console.log('   ✓ Copied keystore.properties');

// Update build.gradle
console.log('\n📝 Updating build.gradle...');
let buildGradle = fs.readFileSync(BUILD_GRADLE, 'utf8');

// Check if release signing config already exists
if (buildGradle.includes('signingConfigs.release')) {
  console.log('   ✓ Release signing config already present');
} else {
  // Add release signing config
  const signingConfigsPattern = /(signingConfigs\s*\{[^}]*debug\s*\{[^}]*\})/s;
  const releaseSigningConfig = `$1
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }`;

  buildGradle = buildGradle.replace(
    signingConfigsPattern,
    releaseSigningConfig
  );

  // Update release buildType to use release signing
  buildGradle = buildGradle.replace(
    /release\s*\{([^}]*?)signingConfig\s+signingConfigs\.debug/s,
    'release {$1signingConfig signingConfigs.release'
  );

  fs.writeFileSync(BUILD_GRADLE, buildGradle);
  console.log('   ✓ Added release signing configuration');
  console.log('   ✓ Updated release build type');
}

// Update .gitignore
console.log('\n📝 Updating .gitignore...');
if (fs.existsSync(GITIGNORE)) {
  let gitignore = fs.readFileSync(GITIGNORE, 'utf8');

  if (!gitignore.includes('keystore.properties')) {
    gitignore += `
# Keystore files
keystore.properties
*.keystore
*.jks
!app/debug.keystore
`;
    fs.writeFileSync(GITIGNORE, gitignore);
    console.log('   ✓ Added keystore files to .gitignore');
  } else {
    console.log('   ✓ .gitignore already configured');
  }
}

console.log('\n✅ Android signing setup complete!\n');
console.log('You can now build a release AAB with:');
console.log('   cd android && ./gradlew :app:bundleRelease\n');
