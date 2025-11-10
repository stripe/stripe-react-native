# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Linting
- `yarn typescript` - Type-check TypeScript files
- `yarn lint` - Lint code with ESLint
- `yarn lint --fix` - Fix linting issues automatically
- `yarn test` - Run Jest unit tests
- `yarn prepare` - Build the library (runs `bob build && husky`)

### Development Setup
- `yarn bootstrap` - Setup project by installing dependencies and CocoaPods
- `yarn bootstrap-no-pods` - Setup without installing CocoaPods
- `yarn pods` - Install CocoaPods for iOS (example app)
- `yarn update-pods` - Update specific Stripe pod dependencies

### Example App Development Workflow
1. **Setup**: `yarn bootstrap`
2. **Run Example App** (requires 2 terminals):
   - Terminal 1: `yarn example start`
   - Terminal 2: `yarn example ios` OR `yarn example android`

The example app uses a pre-configured demo backend, so no server setup is required.

### Example App Commands
- `yarn example start` - Start Metro server
- `yarn run-example-ios` - Run iOS example app on iPhone 16 simulator
- `yarn run-example-android` - Run Android example app
- `yarn run-example-ios:release` - Build and run iOS app in release mode
- `yarn run-example-android:release` - Build and run Android app in release mode

### Testing
- `yarn test:e2e:ios` - Run all iOS E2E tests using Maestro
- `yarn test:e2e:android` - Run all Android E2E tests using Maestro
- `yarn test-ios ./path/to/test.yml` - Run single iOS E2E test
- `yarn test-android ./path/to/test.yml` - Run single Android E2E test
- `yarn test:unit:ios` - Run iOS native unit tests via Xcode
- `yarn test:unit:android` - Run Android unit tests

### Documentation
- `yarn docs` - Generate API documentation using TypeDoc

### Commit Convention
Follow [conventional commits](https://www.conventionalcommits.org/en):
- `fix:` - Bug fixes
- `feat:` - New features
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions/updates
- `chore:` - Tooling changes

## Architecture Overview

This is the official Stripe React Native SDK, providing payment processing capabilities for mobile apps.

### Key Directories

- **`src/`** - Main TypeScript source code
  - `components/` - React Native components (CardField, PaymentSheet, etc.)
  - `hooks/` - React hooks for payment functionality
  - `types/` - TypeScript type definitions
  - `specs/` - Native module specifications for code generation
  - `functions.ts` - Core payment functions
  - `index.tsx` - Main exports

- **`ios/`** - Native iOS implementation in Swift/Objective-C
  - Uses Stripe iOS SDK (~24.16.1)
  - Supports both Old and New Architecture (Fabric)
  - Test files in `ios/Tests/`

- **`android/`** - Native Android implementation in Kotlin/Java
  - Uses Stripe Android SDK
  - Gradle build configuration

- **`example/`** - Example React Native app demonstrating SDK usage
  - Contains test server in `server/` directory
  - Configured for both iOS and Android development

- **`e2e-tests/`** - End-to-end tests using Maestro framework
  - Platform-specific tests in `ios-only/` and `android-only/`
  - Tests payment flows, UI components, and integrations

### Code Generation

The SDK uses React Native's TurboModules/Fabric for native communication:
- Specs defined in `src/specs/` generate native interfaces
- Both Old and New Architecture supported
- Special patch for Old Architecture compatibility in `patches/old-arch-codegen-fix.patch`

### Build System

- **React Native Builder Bob** - Builds CommonJS, ES modules, and TypeScript declarations
- **CocoaPods** - iOS dependency management
- **Gradle** - Android build system
- **Expo Plugin** - `src/plugin/withStripe.ts` for Expo integration

### Key Components

- **StripeProvider** - Context provider for SDK initialization
- **PaymentSheet** - Pre-built payment UI
- **CardField/CardForm** - Card input components
- **PlatformPayButton** - Apple Pay/Google Pay integration
- **CustomerSheet** - Customer payment method management
- **AddressSheet** - Address collection component

### Testing Strategy

- **Jest** - Unit tests for TypeScript code
- **Maestro** - E2E testing framework for mobile flows
- **Native Tests** - iOS XCTest and Android instrumentation tests
- Mock implementation provided in `jest/mock.js`

### Platform-Specific Notes

- **iOS**: Requires Xcode 14.1+, iOS 13+ deployment target
- **Android**: Requires API 21+, compileSdkVersion 34, Kotlin 2.x
- **React Native**: Compatible with 0.78+, TypeScript 5.7+
- **Expo**: Supported via plugin configuration

### Development File Locations

- **iOS Native**: Open `example/ios/StripeSdkExample.xcworkspace` in Xcode
  - Source files: `Pods > Development Pods > stripe-react-native`
- **Android Native**: Open `example/android` in Android Studio
  - Source files: `reactnativestripesdk` under `Android`
- **TypeScript**: Edit files in `src/` and `example/`

### GitHub Issue Management
- `GH_HOST=github.com gh issue list --repo stripe/stripe-react-native --limit 20` - List recent issues
- `GH_HOST=github.com gh issue view <issue_number> --repo stripe/stripe-react-native` - View specific issue
- `GH_HOST=github.com gh issue view <issue_number> --repo stripe/stripe-react-native --comments` - View issue with comments
- `GH_HOST=github.com gh issue list --repo stripe/stripe-react-native --state all --search "keyword" --limit 30` - Search ALL issues (open/closed) by keyword
- `GH_HOST=github.com gh issue create --repo stripe/stripe-react-native` - Create new issue
- `GH_HOST=github.com gh issue edit <issue_number> --repo stripe/stripe-react-native` - Edit issue
- `GH_HOST=github.com gh pr create --repo stripe/stripe-react-native` - Create pull request
- Always use `--state all` when searching to include closed/resolved issues
- Always check GitHub issues for similar problems before investigating user reports
- Use GitHub CLI to distinguish between SDK bugs vs integration issues

### Filing PRs
When using the GitHub `gh` command, ALWAYS set `GH_HOST=github.com`. For example: `GH_HOST=github.com gh pr create --title [...]`

### Old Architecture Compatibility

The SDK maintains compatibility with React Native's Old Architecture via `patches/old-arch-codegen-fix.patch`. This patch converts EventEmitter properties to callback functions for code generation compatibility with RN ≥ 0.74.

## How to add features to React Native SDK

### Step by step guide for adding a feature to the React Native SDK

#### Passing data to our native SDKs

##### 1. Update your relevant data type like `PaymentSheet.IntentConfiguration` in `PaymentSheet.ts`

```
export type IntentConfiguration = {
    onBehalfOf: string;
}
```

##### 2. Parse your parameter from `arguments` in Android, and `params` in iOS and pass it into our Native Code

Android
```
PaymentSheetManager.kt

override fun onCreate() {
    val onBehalfOf = arguments.getString("onBehalfOf")

    val intentConfiguration = PaymentSheet.IntentConfiguration(
        ...
        onBehalfOf = onBehalfOf
    )
}
```

iOS
```
StripeSDKImpl+PaymentSheet.swift

guard let intentConfiguration = params["intentConfiguration"] as? NSDictionary

let intentConfig = buildIntentConfiguration(
    onBehalfOf: intentConfiguration["onBehalfOf"]
)

PaymentSheet.IntentConfiguration.init(intentConfiguration: intentConfig)
```

#### Implementing a bridge to communicate between Native and ReactNative SDKs

We will be implementing in Native code (Android & iOS)
1. Emitters to send events to React Native
2. Callbacks that React Native will invoke so we can get data back

and in React Native we will be
1. Listening for emitted events
2. Invoking native callbacks to pass information back
3. Updating specs so two sides know which events & callbacks to implement

##### 1. Emit an event in native iOS or Android code

Android
```
ReactNativeCustomerSessionProvider.kt

override suspend fun provideSetupIntentClientSecret(customerId: String): Result<String> {
    ...
    stripeSdkModule?.eventEmitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
    val resultFromJavascript = it.await()
    return Result.success(resultFromJavascript)
}
```
iOS

```
StripeSdkImpl.swift

var clientSecretProviderSetupIntentClientSecretCallback: ((String) -> Void)? = nil


StripeSdkImpl+CustomerSheet.swift

let intentConfiguration: CustomerSheet.IntentConfiguration = CustomerSheet.IntentConfiguration(
    ...
    setupIntentClientSecretProvider: {
        return try await withCheckedThrowingContinuation { 
            continuation in
            // Store the continuation to be resumed later
            self.clientSecretProviderSetupIntentClientSecretCallback = { clientSecret in
                continuation.resume(returning: clientSecret)
            }
            // Emit the event to JS
            self.emitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
        }
    }
)

```
##### 2. Add the event, and implement the emitter.

Shared code
```
events.ts

onCustomerSessionProviderSetupIntentClientSecret: EventEmitter<UnsafeObject<any>>;

//or if no params 
onCustomerSessionProviderSetupIntentClientSecret: EventEmitter<void>;
```


Android 
```
EventEmitterCompat.kt

fun emitOnCustomerSessionProviderSetupIntentClientSecret(value: ReadableMap?) {
    invoke("onCustomerSessionProviderSetupIntentClientSecret", value)
}
```

iOS

```
StripeSdkEmitter.swift

func emitOnCustomerSessionProviderSetupIntentClientSecret(_ value: [String: Any])
```

##### 3. Write the function signatures for native callbacks

React Native

```
NativeStripeSdkModule.ts

clientSecretProviderSetupIntentClientSecretCallback(
setupIntentClientSecret: string
): Promise<void>;
```


Android
```
NativeStripeSDKModuleSpec.java 

@ReactMethod
@DoNotStrip
public abstract void clientSecretProviderSetupIntentClientSecretCallback(String setupIntentClientSecret, Promise promise);
```

iOS
```
StripeSdk.mm

RCT_EXPORT_METHOD(clientSecretProviderSetupIntentClientSecretCallback:(nonnull NSString *)setupIntentClientSecret
    resolve:(nonnull RCTPromiseResolveBlock)resolve
    reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared clientSecretProviderSetupIntentClientSecretCallback:setupIntentClientSecret resolver:resolve rejecter:reject];
}
```

##### 4. Implement the shared React Native listener code and invoke native callbacks

```
CustomerSheet.tsx

let customerSessionClientSecretProviderCallback: EventSubscription | null = null;

setupIntentClientSecretProviderCallback?.remove();
setupIntentClientSecretProviderCallback = addListener(
'onCustomerSessionProviderSetupIntentClientSecret',
async ({param_from_native_code}) => {
    const setupIntentClientSecret = await params.provideSetupIntentClientSecret(param_from_native_code);

    await NativeStripeSdk.clientSecretProviderSetupIntentClientSecretCallback(
        setupIntentClientSecret
    );
}
);

```

##### 5. Listen for the results from React Native to complete the callbacks created in step 1

Android
```
StripeSdkModule.kt

override fun clientSecretProviderSetupIntentClientSecretCallback(
    setupIntentClientSecret: String,
    promise: Promise,
) {
    customerSheetFragment?.let {
        it.customerSessionProvider?.provideSetupIntentClientSecretCallback?.complete(setupIntentClientSecret)
    } ?: run {
        promise.resolve(CustomerSheetFragment.createMissingInitError())
        return
    }
}
```

iOS
```
StripeSdkImpl+CustomerSheet.swift

@objc(clientSecretProviderSetupIntentClientSecretCallback:resolver:rejecter:)
public func clientSecretProviderSetupIntentClientSecretCallback(setupIntentClientSecret: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
    self.clientSecretProviderSetupIntentClientSecretCallback?(setupIntentClientSecret)
    resolve([])
}
```

