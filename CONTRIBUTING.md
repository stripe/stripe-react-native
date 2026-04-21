# Contributing

We want this community to be friendly and respectful to each other.

## Prerequisites

### Required (all platforms)

- **nodenv with Node 22** — Stripe's standard Node version manager. The repo includes a `.node-version` file, so nodenv selects the right version automatically.
  ```sh
  nodenv install   # installs the pinned version if not already present
  ```
  Not using nodenv? Install Node 22 via [nodejs.org](https://nodejs.org) or your preferred method.
- **Yarn 1.x** — install if not already present:
  ```sh
  npm install --global yarn@1
  ```
- **Watchman** (macOS — required for Metro file watching):
  ```sh
  brew install watchman
  ```

### iOS

- **Xcode** with iOS simulator runtimes installed
- **CocoaPods**:
  ```sh
  brew install cocoapods
  ```
- **SwiftLint** (required for pre-commit hooks):
  ```sh
  brew install swiftlint
  ```

### Android

- **Android Studio** with Android SDK installed
  - Open Android Studio via terminal to pick up your shell environment: `open /Applications/Android\ Studio.app`
- **JDK 17+** (Android Gradle Plugin requirement). Homebrew OpenJDK works:
  ```sh
  brew install openjdk@17
  ```

## Getting started

### 1. Clone and bootstrap

```sh
git clone https://github.com/stripe/stripe-react-native.git
cd stripe-react-native
yarn bootstrap
```

`yarn bootstrap` runs three steps:
1. `yarn example` — installs JS dependencies for the example app
2. `yarn` — installs JS dependencies for the SDK itself (and runs `prepare`, which builds the TypeScript)
3. `yarn pods` — runs `pod install` for the iOS example app

If `pod install` fails with a CDN error, retry — CocoaPods CDN can be flaky:
```sh
cd example/ios && pod install --repo-update
```

### 2. Run the example app

The example app uses a pre-configured remote demo backend, so **no server setup is required**.

**iOS:**
```sh
# Terminal 1: Start Metro bundler
yarn example start

# Terminal 2: Build and run on simulator
yarn example ios
```

Or open `example/ios/example.xcworkspace` in Xcode and run the `ReactTestApp` scheme.

**Android:**
```sh
# Terminal 1: Start Metro bundler
yarn example start

# Terminal 2: Build and run on emulator/device
yarn example android
```

Or open `example/android` in Android Studio and run the app from there.

### Editing native code

- **iOS**: Open `example/ios/example.xcworkspace` in Xcode. Find SDK source files at `Pods > Development Pods > stripe-react-native`.
- **Android**: Open `example/android` in Android Studio. Find SDK source files under `reactnativestripesdk`.
- **TypeScript**: Edit files in `src/` and `example/` with your editor of choice.

## Tests

### TypeScript unit tests

```sh
yarn test
```

### iOS native unit tests

```sh
yarn test:unit:ios
```

### Android native unit tests

```sh
yarn test:unit:android
```

### E2E tests (Maestro)

We use [Maestro](https://maestro.mobile.dev/) for end-to-end testing. Install it first:

```sh
brew tap mobile-dev-inc/tap
brew install maestro
```

Then build and run the example app, and run the tests:

```sh
# Build the example app first
yarn run-example-ios    # or: yarn run-example-android

# Run all e2e tests
yarn test:e2e:ios       # or: yarn test:e2e:android

# Run a single test
yarn test-ios ./e2e-tests/ios-only/financial-connections-token.yml
```

If Maestro can't find a device, create one:
```sh
maestro start-device --platform=ios --os-version 18
```

## Linting and formatting

Pre-commit hooks (via [Husky](https://typicode.github.io/husky/)) automatically run lint, typecheck, and formatting on every commit. You can also run them manually:

```sh
yarn lint                    # ESLint
yarn typescript              # TypeScript type-check
yarn format:android:check    # Kotlin formatting (spotless)
yarn format:android:write    # Auto-fix Kotlin formatting
yarn format:ios:check        # SwiftLint
yarn format:ios:write        # Auto-fix Swift formatting (changed files only)
```

To fix ESLint issues:
```sh
yarn lint --fix
```

## Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en):

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes to documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests using Maestro or native unit tests.
- `chore`: tooling changes, e.g. change CI config.


## Updating native SDKs

The React Native SDK depends on underlying native [iOS](https://github.com/stripe/stripe-ios) and [Android](https://github.com/stripe/stripe-android) SDKs. To update:

**iOS:** Update `stripe_version` in `stripe-react-native.podspec`, then run `yarn update-pods`.

**Android:** Update `StripeSdk_stripeVersion` in `android/gradle.properties`.

## Maintaining the Stripe old-architecture patch

We ship `patches/old-arch-codegen-fix.patch` so that the library builds on **React-Native >= 0.74 in the old architecture** (it converts `EventEmitter` properties into callback functions so code-gen doesn't fail).

### When to update the patch

The patch needs to be updated when:
- You modify `src/specs/NativeStripeSdkModule.ts` and add/remove/change EventEmitter properties
- You upgrade dependencies that might affect the TurboModule interface
- The patch fails to apply during testing or CI

### How to update the patch

1. **Make your changes to the source code** in `src/specs/NativeStripeSdkModule.ts`

2. **Create a backup of the original file**:
   ```bash
   cp src/specs/NativeStripeSdkModule.ts src/specs/NativeStripeSdkModule.ts.orig
   ```

3. **Apply the old-arch compatible changes**:
   - Remove the `EventEmitter` import from the imports section
   - Convert all `EventEmitter` properties to callback function methods
   - For example, change:
     ```typescript
     onConfirmHandlerCallback: EventEmitter<{
       paymentMethod: UnsafeObject<PaymentMethod.Result>;
       shouldSavePaymentMethod: boolean;
     }>;
     ```
     To:
     ```typescript
     onConfirmHandlerCallback(
       callback: (event: {
         paymentMethod: UnsafeObject<PaymentMethod.Result>;
         shouldSavePaymentMethod: boolean;
       }) => void
     ): void;
     ```

4. **Generate the new patch**:
   ```bash
   diff -u src/specs/NativeStripeSdkModule.ts.orig src/specs/NativeStripeSdkModule.ts > patches/old-arch-codegen-fix.patch
   ```

5. **Test the patch**:
   ```bash
   # Test that the patch applies cleanly
   git stash  # stash your changes
   patch -p0 < patches/old-arch-codegen-fix.patch
   # Verify the file looks correct
   git stash pop  # restore your changes
   ```

6. **Commit the updated patch**:
   ```bash
   git add patches/old-arch-codegen-fix.patch
   git commit -m "chore: update old-arch codegen fix patch"
   ```


## Scripts reference

| Script | Description |
|--------|-------------|
| `yarn bootstrap` | Install all dependencies and pods |
| `yarn test` | Run TypeScript unit tests (Jest) |
| `yarn test:unit:ios` | Run iOS native unit tests (xcodebuild) |
| `yarn test:unit:android` | Run Android native unit tests (Gradle) |
| `yarn test:e2e:ios` | Run iOS e2e tests (Maestro) |
| `yarn test:e2e:android` | Run Android e2e tests (Maestro) |
| `yarn typescript` | Type-check with TypeScript |
| `yarn lint` | Lint with ESLint |
| `yarn example start` | Start Metro bundler |
| `yarn example ios` | Run example app on iOS simulator |
| `yarn example android` | Run example app on Android emulator |
| `yarn run-example-ios` | Build and run iOS example (iPhone 16 Pro Max) |
| `yarn run-example-android` | Build and run Android example |
| `yarn format:android:check` | Check Kotlin formatting |
| `yarn format:android:write` | Fix Kotlin formatting |
| `yarn format:ios:check` | Check Swift formatting (SwiftLint) |
| `yarn format:ios:write` | Fix Swift formatting (changed files) |
