# Android Release Signing Setup

This document explains how Android release signing is configured for this app.

## Overview

Android signing credentials are stored in the `.signing/` directory (which is NOT committed to git). After running `expo prebuild`, these credentials are automatically restored to the `android/` directory.

## Files

### Safe Storage (Backed up, not in git)
- `.signing/upload-keystore.jks` - Your Android keystore
- `.signing/keystore.properties` - Keystore credentials

### Generated (Will be recreated after prebuild)
- `android/upload-keystore.jks` - Copy of keystore (auto-restored)
- `android/keystore.properties` - Copy of credentials (auto-restored)
- `android/app/build.gradle` - Updated with signing config (auto-patched)

## Workflow

### Bumping Version for Play Store

**Before building a new release**, increment the version code in `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",  // Human-readable version (optional to bump)
    "android": {
      "versionCode": 2,  // INCREMENT THIS for each Play Store upload
      ...
    }
  }
}
```

The `versionCode` must be **higher than any previous upload**. The Play Store uses this to determine which version is newer.

**Version naming convention:**
- `versionCode` - Integer that must increase (1, 2, 3, ...) - **Required for Play Store**
- `version` - Human-readable string (1.0.0, 1.0.1, 1.1.0) - Shown to users

### After Bumping Version

Run `expo prebuild` to apply the new version to the Android project:

```bash
expo prebuild
# Signing automatically configured via postprebuild hook! ✅
```

The signing setup runs automatically via the `postprebuild` hook in `package.json`.

### Manual Setup (if needed)

If you need to manually restore signing configuration:

```bash
yarn setup-android-signing
```

### Building Release AAB

```bash
cd android
./gradlew :app:bundleRelease
```

The signed AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### Complete Release Workflow

**Full workflow for creating a new Play Store release:**

```bash
# 1. Bump version in app.json
#    Edit: "android": { "versionCode": 3 }

# 2. Regenerate Android project with new version
expo prebuild
# ✅ Signing automatically configured!

# 3. Build the release AAB
cd android
./gradlew :app:bundleRelease

# 4. Upload to Play Store
# The AAB is at: android/app/build/outputs/bundle/release/app-release.aab
```

## Verification

To verify your AAB is signed correctly:

```bash
cd android
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep "Signed by"
```

To check the certificate fingerprint:

```bash
keytool -list -v -keystore upload-keystore.jks -alias upload
```

## First Time Setup

If you're setting this up for the first time:

1. Place your keystore files in `.signing/`:
   - `upload-keystore.jks`
   - `keystore.properties`

2. Run the setup:
   ```bash
   yarn setup-android-signing
   ```

3. Build and test:
   ```bash
   cd android
   ./gradlew :app:bundleRelease
   ```

## Certificate Fingerprints

Your current certificate fingerprints (for Play Store verification):

- **SHA1:** `01:E0:93:A3:85:56:31:D4:A3:2B:0E:DA:EB:21:A5:C0:15:CF:2A:E5`
- **SHA256:** `E7:A0:BD:3C:63:CA:0D:27:3B:F8:1B:86:46:EC:73:F9:28:51:38:35:1F:2E:77:2E:0B:7B:21:F0:37:1D:F5:1C`

## Security

- ✅ `.signing/` directory is in `.gitignore`
- ✅ `keystore.properties` is in `.gitignore`
- ✅ `*.jks` files are in `.gitignore`
- ✅ `android/` directory is regenerated and not committed

**IMPORTANT:** Keep a secure backup of your `.signing/` directory. Store it in:
- Your password manager
- Company secrets vault
- Encrypted cloud storage

If you lose these files, you cannot update your app on the Play Store!

## Troubleshooting

### "Version code X has already been used" error from Play Store

You need to increment the version code in `app.json`:

```json
{
  "expo": {
    "android": {
      "versionCode": 3  // Increment this number
    }
  }
}
```

Then rebuild:
```bash
expo prebuild
cd android && ./gradlew :app:bundleRelease
```

**Note:** The version code must always be higher than any previous upload to the Play Store, including versions you may have deleted.

### "Keystore file not found" error

Run the setup script manually:
```bash
yarn setup-android-signing
```

### After `expo prebuild` the signing is lost

The `postprebuild` hook should run automatically. If it doesn't:
1. Check that `.signing/` directory exists with both files
2. Run `yarn setup-android-signing` manually
3. Check `package.json` has the `postprebuild` script

### Wrong certificate error from Play Store

Verify your certificate fingerprint matches:
```bash
cd android
keytool -list -v -keystore upload-keystore.jks -alias upload
```

Compare with the fingerprint Play Store expects.
