# Stripe Identity example

This dedicated example uses `useStripeIdentity` from `@stripe/stripe-react-native`
to present document, ID number, address, and phone verification. It was migrated
from the `stripe-identity-react-native` example; its MIT license is retained in
[LICENSE](LICENSE).

The Identity UI lives here, while [../example](../example) owns the native app,
React and React Native versions, dependencies, Metro/Babel settings, CocoaPods,
Gradle, and lockfiles. Install and upgrade those shared dependencies once. This
directory deliberately has no package manifest or native project.

The playground has its own UI and JavaScript entrypoint, but uses the same app
identifier and native installation as Payments. The examples cannot be installed
side by side. This shares Identity's versions with Payments; the existing SDK
root and Connect example still maintain their own JavaScript manifests.

## Run

From the repository root, install the shared example using `yarn bootstrap`
(`yarn bootstrap-no-pods` for Android only).

Start Metro for Identity in one terminal:

```sh
yarn example:identity
```

Then launch the shared native app in another terminal:

```sh
yarn run-example-identity-ios
# or
yarn run-example-identity-android
```

These launch commands use `--no-packager` so they connect to the Identity Metro
server. Stop any existing Metro server before switching examples. To return to
Payments, stop Identity Metro and run `yarn example start`, then launch with the
usual `yarn run-example-ios` or `yarn run-example-android` command.

The Identity Metro config inherits the shared config and serves this directory's
`index.js` for the native app's normal `index.bundle` request. That entrypoint
registers Identity under the shared native app key. Use the dedicated Identity
Metro command above to run this example. The normal Payments entrypoint and
single-app launch remain unchanged.

The example creates sessions with Stripe's mobile Identity playground backend.
Use **Use Test Mode** to select test sessions. A production integration should
create verification sessions and ephemeral keys on its own server.

For a release bundle, run `yarn build-example-identity-ios` or
`yarn build-example-identity-android`. These write to the shared example's `dist/`
directory. On iOS, run `yarn pods` after bundling so the generated project includes
the bundle and images, then build the shared app in Release mode. Rebuild the
Payments bundle with `yarn example build:ios` or `yarn example build:android` when
switching back.

## Checks

From the repository root:

```sh
yarn typescript
yarn test --runInBand example-identity
```

CI also builds this example in Release mode on iOS and Android and runs its
Maestro flow. The flow opens the native document-verification screen using a
test session, cancels, and checks that `FlowCanceled` returns to the example.
It does not capture or submit identity documents. Identity's lint, TypeScript,
Jest, and native unit tests run in the existing shared jobs.

To run the same flow locally after building and installing the Identity example
on a simulator or emulator:

```sh
yarn test:e2e:ios --identity
# or
yarn test:e2e:android --identity
```

Both examples use the same native build and camera configuration. The shared
Android app uses a MaterialComponents theme; the shared iOS Podfile configures a
camera usage description for document verification.

The shared app already enables Onramp on iOS and Android, which includes Identity
automatically. In a separate iOS consumer app, select the
`stripe-react-native/Identity` subspec in your Podfile or set `includeIdentity: true`
in the Expo config plugin. See [Identity setup](../README.md#identity).

The shared Android app uses API 24 or higher. Payments-only consumers retain API
23 support. In a separate Android consumer app, enable Identity with
`StripeSdk_includeIdentity=true` in
`android/gradle.properties` (or `includeIdentity: true` in the Expo config plugin)
and use `minSdkVersion` 24 or higher.
