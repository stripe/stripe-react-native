# Contributing

## Prerequisites

### Required (all platforms)

- **nodenv with Node 22** — Stripe's standard Node version manager. The repo includes a `.node-version` file, so nodenv selects the right version automatically.
  ```sh
  nodenv install   # installs the pinned version if not already present
  ```
  Not using nodenv? Install Node 22 via [nodejs.org](https://nodejs.org) or your preferred method.
- **Yarn** — the repo pins Yarn 4 through `packageManager` in `package.json` and a committed release in `.yarn/releases`. Enable Corepack (bundled with Node), or use any global Yarn 1.22 binary; both run the pinned release:
  ```sh
  corepack enable
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
yarn install
yarn bootstrap
```

Yarn 4 runs `package.json` scripts only after the first `yarn install`, so install before running `yarn bootstrap` or any other script in a fresh clone. `yarn bootstrap` then runs four steps:
1. `yarn example` — installs JS dependencies for the example app
2. `yarn` — installs JS dependencies for every workspace package
3. `yarn prepare` — builds the legacy package into `lib/` and installs the Git hooks (Yarn 4 does not run `prepare` on install)
4. `yarn pods` — runs `pod install` for the iOS example app

If `pod install` fails with a CDN error, retry — CocoaPods CDN can be flaky:
```sh
cd example/ios && pod install --repo-update
```

### 2. Run the example app

The example app uses a remote demo backend at `rigorous-heartbreaking-cephalopod.stripedemos.com`, so **no local server setup is required**. If you need to modify the backend (e.g. add a new endpoint), update the sandbox app at [sandbox-apps/rigorous-heartbreaking-cephalopod](https://codesandbox.io/p/devbox/rigorous-heartbreaking-cephalopod-m358cz) and deploy to stripedemos.com.

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
- **TypeScript**: Edit files in `src/` and `example/` with your editor of choice. Metro picks up JS/TS changes from `src/` directly, but type definitions are served from `lib/`. If you change the SDK's public API and your editor shows stale types, run `yarn build` at the repo root to rebuild `lib/`.

## Workspace packages and Nx

The repository is a Yarn workspace. The legacy `@stripe/stripe-react-native` package lives at the root, and the private packages live under `packages/*` and `tooling/*` (`examples/*` is reserved for workspace example apps). The existing `example/` and `example-stripe-connect/` apps are separate Yarn projects with their own lockfiles.

[Nx](https://nx.dev/) runs the `build`, `typecheck`, `lint`, `test`, and `pack` scripts of every workspace package in dependency order and caches the results locally in `.nx/cache`:

```sh
yarn nx run-many -t build typecheck lint test     # every package
yarn nx affected -t build typecheck lint test     # packages changed since `defaultBase` in nx.json, plus their dependents
yarn nx affected -t test --base=origin/master     # compare against another base
yarn nx run @stripe/react-native-core:lint        # one target of one package
yarn nx show projects                             # list workspace packages
yarn nx reset                                     # clear the local cache
```

Each package defines whichever of these scripts apply to it in its own `package.json`; Nx skips packages that lack a target. Packages run shared tools from the root with `yarn run -T <tool>`.

Shared dependency versions live in the `catalog` section of `.yarnrc.yml`. Reference them from a `package.json` with `"<name>": "catalog:"` instead of repeating a version range.

Packages import each other by package name and public entry point only. ESLint rejects relative imports that cross a package boundary (`import/no-relative-packages`), and, inside workspace packages, imports of another package's `src` or `lib` paths.

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

### Bridge contract fixtures

Every value that crosses the bridge untyped has shared fixtures in `packages/bridge-contracts/fixtures/<family>/<method>.<case>.json`. That covers TurboModule parameters typed `UnsafeObject` or `Object`, results typed `UnsafeObject`, and component props typed `UnsafeMixed`. The same file is loaded by three tests:

- **Jest** (`src/types/__tests__/bridgeContracts.test.tsx`) calls the public API with the fixture input and checks that the TurboModule receives exactly that input.
- **XCTest** (`ios/Tests/BridgeContractTests.swift`) and **Robolectric** (`android/src/test/.../bridgecontracts/BridgeContractTest.kt`) pass the input to the production mapper and check the resulting Stripe SDK objects.

```sh
yarn test:bridge                      # checks, Jest, XCTest, and Robolectric (iOS needs `yarn pods` first)
yarn test:bridge --only=js            # checks and Jest only (local; the CI JS job does not run this)
yarn test:bridge --only=ios,android   # the native loaders only
```

`yarn test:bridge` is the Nx target `@stripe/bridge-contracts:test:bridge`. The native loaders also run as part of `yarn test:unit:ios` and `yarn test:unit:android`. The CI JS job runs `check.mjs` from the package gate (`--bridge=js`) and runs `bridgeContracts.test.tsx` inside the Jest coverage suite. iOS honours `IOS_SIMULATOR`, as `yarn test:unit:ios` does.

A fixture looks like this:

```json
{
  "method": "StripeSdk.initPaymentSheet",
  "description": "What this case pins.",
  "input": { "params": { "merchantDisplayName": "Example, Inc.", "returnURL": "example://stripe" } },
  "expect": {
    "shared": { "configuration.merchantDisplayName": "Example, Inc." },
    "ios": { "configuration.returnURL": "example://stripe" },
    "android": {}
  },
  "platformOnly": { "configuration.returnURL": "Why only iOS reads it." }
}
```

- `input` is keyed by the TurboModule parameter names (or the component prop names) from `src/specs`, in spec order. Write a JS function value as `"$function"`.
- Assertion keys are dot paths into what the native runner returns, such as `configuration.merchantDisplayName`, `intentConfiguration.mode.amount`, `api.billing_details.name` (the Stripe API parameters), or `result.error.code` (the promise result). A rejected promise appears as `result.rejected.code` and `result.rejected.message`, and a promise that never settles as the string `"<unresolved>"`. Values are JSON. Enums are compared by case name with a lowercase first letter (`vertical`, `offSession`; an all-caps name such as `NEVER` becomes `never`), colours as `#rrggbb`, `null` matches a missing value, and `"$present"` matches any non-null value.
- `shared` keys must hold on both platforms. A key in only one platform block needs a reason in `platformOnly` (the option is documented as platform-specific) or in `parityGaps` (the platforms differ today). A key in both platform blocks with different values must be in `parityGaps`. Fixtures pin current behaviour: when a fixture shows that the platforms differ, record it in `parityGaps` and raise it separately rather than changing the mapper in the same change. Each `parityGaps` reason starts with an id from `packages/bridge-contracts/PARITY-GAPS.md` (`"G3: …"`), and that file's row lists every fixture that uses the id; add or extend a row when you pin a new difference. If a fixture cannot pin current behaviour because it crashes, hangs, resolves twice, or cannot run in the test, fix that in its own commit ahead of the fixture, and say in that commit why the behaviour could not be pinned instead.
- Every input field must be asserted. A key covers a field when it ends with the field's last two path segments, ignoring case and underscores. Otherwise map the field to a key in `covers`, or give a reason in `unasserted`.
- Every untyped parameter or component prop needs at least one fixture of its own method or component that passes it.
- `platforms: ["android"]` (or `["ios"]`) limits a fixture to one platform; it then needs a `description` saying why. `skipTypecheck` (a reason) allows an input that the public types reject, to pin how native handles it. If the entry itself exists on both platforms, every key the fixture asserts must also be in `parityGaps`, with a `PARITY-GAPS.md` row. An entry that exists on only one platform says so with `"platforms"` in `inventory.json`.

`packages/bridge-contracts/scripts/check.mjs` enforces these rules. It reads `src/specs` to find every untyped boundary and fails when one is missing from `packages/bridge-contracts/inventory.json`, or when an inventory entry has no fixture and no `pending` note. It also type-checks each `input` against the public types the specs use (string enums are written as their values).

**Adding fixtures for a new bridge method:**

1. Add the method to `inventory.json` with its family. `check.mjs` tells you if you forget.
2. Add `fixtures/<family>/<method>.<case>.json`. Start from the TypeScript input an app would pass.
3. Add a JS adapter in `src/types/__tests__/bridgeContracts.test.tsx` that calls the public API. For a `component:` entry, the adapter renders the public component and records the props its native component receives.
4. Add a runner for the method on each platform: in `ios/Tests/BridgeRunners.swift` or one of its `BridgeRunners+<Families>.swift` extensions, and in `android/src/test/java/com/reactnativestripesdk/bridgecontracts/BridgeRunners.kt` or one of the `<Families>Runners.kt` files beside it. A runner calls the production mapper (not a copy of it) and returns the objects the keys resolve against. When the two SDKs name a property differently, add an alias from the shared key to the native path instead of renaming the key. If the mapper cannot be called without UI or the network, extract it in a separate refactor commit first. When the call itself needs UI or the network, call the mapper directly, and call the method only for inputs it rejects before that point. A component runner sets the props on the native view or view manager, as React does, and reads back the state the prop setters put on the Stripe views.
5. On iOS, re-run `yarn pods` after adding a Swift test file, so the Podfile adds it to `ReactTestAppTests`.
6. Run `yarn test:bridge`.

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

### Coverage

A change that touches library code (`src/**`, `packages/*/src/**`) or native code (`ios/**`, `android/src/main/**`, `packages/*/ios/**`, `packages/*/android/src/main/**`) is ready for review only when it comes with coverage evidence for the paths it changes. Codegen specs and test sources do not count.

**Jest coverage and floors.** Each package's Jest coverage has a floor in `tooling/test-harness/coverage-floors.json`. A floor is the coverage the package had when it was recorded, and it only moves up:

```sh
bash ./scripts/coverage jest                    # fails if a package is below its floor
bash ./scripts/coverage floors:update           # raises floors to the measured values (never lowers one)
COVERAGE_FLOORS_BASE=origin/master bash ./scripts/coverage jest   # also fails if the floors file lowers a floor recorded on the base
```

CI runs the same check, and on pull requests it compares the floors file with the target branch. When your change raises coverage, run `bash ./scripts/coverage floors:update` and commit the new floors. A workspace package that gains its first `src` files needs an entry and a floor before the check passes; `bash ./scripts/coverage floors:update` adds both. The measured scope can't shrink silently either: a pull request that adds an `exclude` glob, changes a package's `dir`, or removes a package fails unless the floors file's `scopeChanges` names that package with the reason. Remove the `scopeChanges` entry in your next change.

**Native and JS coverage from the test harness.** `tooling/test-harness` is a private React Native app that exists only to run the SDK under [react-native-coverage](https://docs.page/invertase/react-native-coverage). It is never published, and no published package may depend on react-native-coverage. It requires Maestro (see above), a booted simulator or a running emulator, and the native toolchains above.

```sh
IOS_SIMULATOR_UDID=<udid> bash ./scripts/coverage ios     # or IOS_SIMULATOR=<booted simulator name>
ANDROID_SERIAL=<serial> bash ./scripts/coverage android   # ANDROID_SERIAL is needed only when several devices are attached
bash ./scripts/coverage assert                            # re-check the artifacts of both platforms
```

Each command bundles the harness with JS instrumentation, builds and installs a debug app, runs `tooling/test-harness/e2e/coverage-run.yaml`, pulls the coverage the app flushes, and fails (exit 2) unless the reports contain hits in SDK code. The reports land in `coverage/`:

| Report | Path |
|--------|------|
| iOS native (LCOV) | `coverage/ios/lcov.info` |
| Android native (Jacoco XML) | `coverage/android/jacocoTestReport.xml` |
| JS from the harness run (LCOV) | `coverage/js/ios/lcov.info`, `coverage/js/android/lcov.info` |
| Jest (LCOV and HTML) | `coverage/jest/root/` (legacy package), `coverage/jest/packages/<name>/` |

Run one Android build at a time per worktree: the harness and the example app build the SDK into the same `android/build` directory, so building both at once corrupts it.

Native reports are trustworthy only for the run that produced them: each command deletes the previous raw data first, so always re-run the command rather than re-processing old files. If your change adds native code that the harness does not reach, add a scenario to `tooling/test-harness/src/scenarios.ts`. Scenarios must finish without network access or user input.

**What to include in a pull request.** For each changed library or native file, give the covered lines from the reports above (per file, not a package total), say which test or harness scenario exercises each changed branch, and explain any changed line that stays uncovered.

## Package done gate

A package is done only when its done gate passes. The gate catches what unit tests miss: a file or export missing from the published package, a bridge value one platform maps differently, a forbidden stripe-ios import, or a package that does not build in an Expo app.

```sh
yarn gate:package payments                          # every step for one package
yarn gate:package --all --skip=expo --bridge=js           # every package, JS steps (what the CI JS job runs)
yarn gate:package core --only=pack,spi              # selected steps
yarn nx run @stripe/react-native-payments:gate      # the same gate as an Nx target
```

A package is named by its npm name, its alias in `tooling/package-gate/packages.json` (`stripe-react-native`, `core`, `payments`, `financial-connections`, `connect`, `issuing`, `onramp`), or its directory. The steps:

| Step | Fails when |
|------|------------|
| `spi` | Non-test iOS code under the package's `ios/` imports `_spi(InternalOnlyAPI)` or `_spi(DashboardOnly)`, other than a site listed in `tooling/package-gate/spi-allowlist.json`, or an allowlist entry no longer matches the source. Only test folders are exempt: files inside a folder named `Tests`, `Test`, or `__tests__` (such as `ios/Tests` or `packages/<name>/ios/Tests`). A file name never exempts a file, so `ios/FooTests.swift` is checked. |
| `pack` | `npm pack --dry-run` (the file list `npm publish` would upload, without contacting the registry) is missing an entry point (`main`, `module`, `types`, `react-native`, `source`, `bin`, every `exports` target), a subpath export the config expects, a podspec, `app.plugin.js`, `android/build.gradle`, the codegen specs, or a configured required file; ships tests (`__tests__`, `__fixtures__`, `__mocks__`, `*.test.*` and `*.spec.*` files and their compiled `lib/` copies, any Android `test*`, `androidTest*`, or `sharedTest*` source set, or an iOS `Tests`, `Test`, or `__tests__` folder), build output, or a tarball; or a runtime dependency uses a `workspace:` or `catalog:` range. |
| `bridge` | An inventory entry in one of the package's bridge families has no fixture or is still pending, or the bridge contract tier fails. `--bridge=js` runs `packages/bridge-contracts/scripts/check.mjs` and does not run Jest. `ios` and `android` run the native loaders (iOS needs `yarn pods` first and honours `IOS_SIMULATOR`). `--all` runs those loaders for every fixture. A package run runs them only for that package's bridge families. |
| `coverage` | A package is below its Jest coverage floor. `--all` checks every workspace floor. A package run checks that package's floor only. |
| `expo` | The Expo smoke build fails (below). |

The last lines of the output say `RESULT <package>: PASS` only when every step ran on every platform. A run with skipped steps or platforms says `PARTIAL`, and a package still marked `"status": "shell"` in `packages.json` says `SHELL`; neither closes a package. Set the status to `"ready"` in the change that gives the package its entry points (the gate fails if a shell has entry points or a `src/` directory). A new directory under `packages/` must be added to `packages.json` before the gate passes, and an entry whose directory has no `package.json` fails every run; both print `RESULT gate config: FAIL`.

**SPI allowlist.** The allowlist records legacy `ios/` imports that still use `_spi(InternalOnlyAPI)` or `_spi(DashboardOnly)`. [#2787](https://github.com/stripe/stripe-react-native/pull/2787) merged; new code must import through `_spi(ReactNativeSDK)` and must not be allowlisted. Remove an entry in the change that switches its import. The list should stay empty; the gate fails on stale entries. Never add an entry for new code.

**Expo smoke app.** `examples/expo-smoke` holds the smoke app's settings (`smoke.config.json`) and one probe screen per package (`probes/<package>.tsx`). The `expo` step packs the package (and any gated package it depends on) with `npm pack`, creates an app from the Expo template for `expoSdk`, installs the tarballs, applies the SDK's profile (iOS deployment target and Android minSdk) and the package's Expo plugin, copies the probe in as the app's entry screen, runs `npx expo prebuild --clean`, and builds an iOS Release simulator app and an Android release APK. Release builds bundle the JavaScript, so an import that does not bundle fails the build. Nothing is launched. The Expo SDK is `expoSdk` in `smoke.config.json` (default for ready packages), optionally overridden per package with `expoSdk` in `packages.json`, and overridden for an entire gate run with `--expo-sdk=<n>` or `EXPO_SMOKE_SDK` (CLI and env beat per-package and global). Each SDK needs an entry in `sdkProfiles`. The step needs network access, Xcode with CocoaPods, and the Android SDK with a JDK. Use `--platforms=ios` or `--platforms=android` for one platform, `--keep-smoke` to keep the generated app, and `--verbose` to echo the build output; logs are in the work directory the step prints.

The smoke app removes `web.output` from the template's `app.json` (`"webOutput": "remove"`), because the packages do not yet bundle for web: with `web.output: "server"`, an Expo Router app's Release bundle also bundles its routes for web and fails on the native-only imports. Set `webOutput` to `"server"` once the packages ship web entry points.

CI runs every package's JS steps except the Expo smoke build (`--skip=expo --bridge=js`). The job sets `GATE_SKIP_BUILD=1` because `_prepare_js` has already built `lib/`; the pack step still checks that output. The Expo smoke build is not part of CI yet; run `yarn gate:package <package>` locally before marking a package done.

## Linting and formatting

Pre-commit hooks (via [Husky](https://typicode.github.io/husky/)) automatically run lint, typecheck, and formatting on every commit. You can also run them manually:

```sh
yarn lint                    # ESLint
yarn typecheck               # TypeScript type-check (also available as `yarn typescript`)
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

**iOS:** Update `stripe_version` in `stripe-react-native.podspec`, then run `yarn pods`. The single `stripe_version` value pins the Swift Package Manager dependency and the retained legacy CocoaPods dependencies. `yarn update-pods` applies only to the legacy CocoaPods infrastructure.

**Android:** Update `StripeSdk_stripeVersion` in `android/gradle.properties`.

## iOS dependency resolution

The Stripe iOS SDK no longer supports CocoaPods resolution. The Stripe React Native SDK resolves it through Swift Package Manager (SPM) and rejects the `disableSPM` and `$StripeDisableSPM` opt-outs. The legacy CocoaPods infrastructure is retained for possible ad hoc releases.

For a full explanation of the SPM resolution mechanism, see the documentation in `stripe_spm.rb`.

| Toggle | Effect |
|--------|--------|
| `OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH=<branch>` | Resolves the Swift package from that branch instead of the pinned release. Used by CI and developers to test against unreleased stripe-ios changes. |

## Changing the public APIs

The public API is everything exported from `src/index.tsx`.
**Important**: After you make changes, run `yarn api-extractor:update`.

### In-development (not yet public) APIs

- Don't export from `src/index.tsx`.
- Exception - if a public type must reference it, tag it with `@internal`.

### Private Preview / Public Preview APIs

- Export from `src/index.tsx`.
- Use `@MyFeaturePrivatePreview` / `@MyFeaturePublicPreview`.

## React Native architecture compatibility

The SDK requires React Native 0.75 or later and the new architecture.

React Native versions before 0.80 still require the event-emitter compatibility layers in `src/events.ts`, Android's `EventEmitterCompat.kt`, and `ios/StripeSdkEventEmitterCompat.{h,m}`.

## Scripts reference

| Script | Description |
|--------|-------------|
| `yarn bootstrap` | Install all dependencies and pods (after the first `yarn install`) |
| `yarn build` | Build the legacy package into `lib/` |
| `yarn nx run-many -t build typecheck lint test` | Build, type-check, lint, and test every workspace package |
| `yarn test` | Run TypeScript unit tests (Jest) |
| `yarn test:unit:ios` | Run iOS native unit tests (xcodebuild) |
| `yarn test:unit:android` | Run Android native unit tests (Gradle) |
| `yarn test:bridge` | Run the bridge contract fixtures on JS, iOS, and Android (`--only=js` skips native) |
| `yarn gate:package <package>` | Run the package done gate (`--all` for every package) |
| `yarn test:e2e:ios` | Run iOS e2e tests (Maestro) |
| `yarn test:e2e:android` | Run Android e2e tests (Maestro) |
| `bash ./scripts/coverage jest` | Run Jest with coverage and check each package's floor |
| `bash ./scripts/coverage floors:update` | Raise coverage floors to the measured values |
| `bash ./scripts/coverage ios` | Build and run the coverage test harness on an iOS simulator |
| `bash ./scripts/coverage android` | Build and run the coverage test harness on an Android emulator |
| `bash ./scripts/coverage assert` | Check that the harness coverage reports contain SDK hits |
| `yarn typecheck` | Type-check with TypeScript |
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
