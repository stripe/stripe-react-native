---
name: add-native-feature
description: Step-by-step guide for adding features requiring JS-to-native bridge communication in the Stripe React Native SDK. Covers TypeScript types, Android Kotlin, iOS Swift, event emitters, bidirectional callbacks, and native module specs.
when_to_use: Use when adding new native functionality, payment methods, extending components with platform-specific capabilities, implementing native-to-JS event communication, or adding new parameters that flow from JavaScript to native iOS/Android code.
---

# How to add features to React Native SDK

This guide explains how to add new features that require communication between React Native (JavaScript) and native code (iOS/Android). Use this when adding new native functionality, payment methods, or extending existing components with platform-specific capabilities.

## Overview

The SDK uses a **bidirectional communication pattern**:
1. **Native -> JavaScript**: Native code emits events that JavaScript listens for
2. **JavaScript -> Native**: JavaScript invokes callbacks to return data to native code


## Part 1: Passing Simple Data to Native SDKs

Use this when adding new configuration parameters that flow one-way from JavaScript to native code.

### Step 1: Update TypeScript Types

Add your new parameter to the relevant type definition in `src/types/`.

**Example:** Adding `onBehalfOf` to `PaymentSheet.IntentConfiguration`

**File:** `src/types/PaymentSheet.ts`

```typescript
export type IntentConfiguration = {
  mode: Mode;
  paymentMethodTypes?: PaymentMethod.Type[];
  onBehalfOf?: string; // New parameter
};
```

### Step 2: Parse Parameters in Native Code

Extract the parameter from the bridge arguments and pass it to the native SDK.

#### Android Implementation

**File:** `android/src/main/java/com/reactnativestripesdk/PaymentSheetManager.kt` (or similar)

```kotlin
override fun onCreate() {
  // Parse the parameter from arguments
  val onBehalfOf = arguments?.getString("onBehalfOf")

  // Pass it to the native SDK
  val intentConfiguration = PaymentSheet.IntentConfiguration(
    mode = mode,
    // ... other existing parameters ...
    onBehalfOf = onBehalfOf
  )
}
```

#### iOS Implementation

**File:** `ios/StripeSdkImpl+PaymentSheet.swift`

```swift
guard let intentConfiguration = params["intentConfiguration"] as? NSDictionary else {
  // handle error
  return
}

// Extract the parameter
let onBehalfOf = intentConfiguration["onBehalfOf"] as? String

// Build the configuration
let intentConfig = PaymentSheet.IntentConfiguration(
  mode: mode,
  // ... other existing parameters ...
  onBehalfOf: onBehalfOf
)
```

---

## Part 2: Implementing Bidirectional Communication

Use this when native code needs to request data from JavaScript (e.g., fetching client secrets, custom validation).

### Communication Flow

```
React Native (JS)  ->  Registers Event Listener
                  |
Native Code (iOS/Android)  ->  Emits Event  ->  JS Listener Triggered
                  |
JS Executes Logic (API call, user input, etc.)
                  |
JS Invokes Native Callback  ->  Native Code Receives Result
                  |
Native Code Continues Execution
```

### Step 1: Emit an Event from Native Code

Create the native code that will request data from JavaScript.

#### Android Implementation

**File:** `android/src/main/java/com/reactnativestripesdk/ReactNativeCustomerSessionProvider.kt` (or similar)

```kotlin
internal var provideSetupIntentClientSecretCallback: CompletableDeferred<String>? = null

override suspend fun provideSetupIntentClientSecret(customerId: String): Result<String> {
  return suspendCancellableCoroutine { continuation ->
    // Store the continuation to resume later
    provideSetupIntentClientSecretCallback = continuation

    // Emit the event to JavaScript
    stripeSdkModule?.eventEmitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
  }
}
```

#### iOS Implementation

**File:** `ios/StripeSdkImpl.swift`

```swift
// Store the continuation as a property
var clientSecretProviderSetupIntentClientSecretCallback: ((String) -> Void)? = nil
```

**File:** `ios/StripeSdkImpl+CustomerSheet.swift`

```swift
let intentConfiguration = CustomerSheet.IntentConfiguration(
  // ... other parameters ...
  setupIntentClientSecretProvider: {
    return try await withCheckedThrowingContinuation { continuation in
      // Store the continuation to be resumed later
      self.clientSecretProviderSetupIntentClientSecretCallback = { clientSecret in
        continuation.resume(returning: clientSecret)
      }

      // Emit the event to JavaScript
      self.emitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
    }
  }
)
```

### Step 2: Define and Implement the Event Emitter

#### 2a. Define the Event Type

**File:** `src/events.ts`

Add your event to the `Events` type:

```typescript
type Events = {
  // ... existing events ...
  onCustomerSessionProviderSetupIntentClientSecret: EventEmitter<void>; // No parameters
  // OR if you need to pass data:
  onCustomerSessionProviderSetupIntentClientSecret: EventEmitter<{
    customerId: string;
  }>;
};
```

**Guidelines:**
- Use `EventEmitter<void>` if no data is passed from native to JS
- Use `EventEmitter<{ param: type }>` for simple parameters
- Use `EventEmitter<UnsafeObject<any>>` for complex objects (use sparingly)

#### 2b. Implement Android Emitter

**File:** `android/src/main/java/com/reactnativestripesdk/EventEmitterCompat.kt`

```kotlin
fun emitOnCustomerSessionProviderSetupIntentClientSecret(value: ReadableMap? = null) {
  invoke("onCustomerSessionProviderSetupIntentClientSecret", value)
}

// For events with no parameters:
fun emitOnCustomerSessionProviderSetupIntentClientSecret() {
  invoke("onCustomerSessionProviderSetupIntentClientSecret")
}
```

#### 2c. Implement iOS Emitter

**File:** `ios/StripeSdkEmitter.swift`

```swift
@objc public protocol StripeSdkEmitter {
  // ... existing methods ...

  // For events with parameters:
  func emitOnCustomerSessionProviderSetupIntentClientSecret(_ value: [String: Any])

  // For events without parameters:
  func emitOnCustomerSessionProviderSetupIntentClientSecret()
}
```

### Step 3: Define Native Callback Signatures

These are the methods JavaScript will call to return data to native code.

#### 3a. TypeScript Spec

**File:** `src/specs/NativeStripeSdkModule.ts`

```typescript
export interface Spec extends TurboModule {
  // ... existing methods ...

  clientSecretProviderSetupIntentClientSecretCallback(
    setupIntentClientSecret: string
  ): Promise<void>;
}
```

#### 3b. Android Spec

**File:** `android/src/oldarch/java/com/reactnativestripesdk/NativeStripeSdkModuleSpec.java`

```java
@ReactMethod
@DoNotStrip
public abstract void clientSecretProviderSetupIntentClientSecretCallback(
  String setupIntentClientSecret,
  Promise promise
);
```

#### 3c. iOS Bridge Declaration

**File:** `ios/StripeSdk.mm`

```objc
RCT_EXPORT_METHOD(clientSecretProviderSetupIntentClientSecretCallback:(nonnull NSString *)setupIntentClientSecret
                  resolve:(nonnull RCTPromiseResolveBlock)resolve
                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared clientSecretProviderSetupIntentClientSecretCallback:setupIntentClientSecret
                                                                   resolver:resolve
                                                                   rejecter:reject];
}
```

### Step 4: Implement JavaScript Event Listener

Listen for the native event and invoke the callback with the result.

**File:** `src/components/CustomerSheet.tsx` (or relevant component)

```typescript
// Declare the EventSubscription at the top of the file
let setupIntentClientSecretProviderCallback: EventSubscription | null = null;

const configureClientSecretProviderEventListeners = (
  clientSecretProvider: ClientSecretProvider
): void => {
  // Remove existing listener to prevent duplicates
  setupIntentClientSecretProviderCallback?.remove();

  // Register the event listener
  setupIntentClientSecretProviderCallback = addListener(
    'onCustomerSessionProviderSetupIntentClientSecret',
    async () => {
      try {
        // Execute the user-provided function (e.g., API call)
        const setupIntentClientSecret =
          await clientSecretProvider.provideSetupIntentClientSecret();

        // Return the result to native code
        await NativeStripeSdk.clientSecretProviderSetupIntentClientSecretCallback(
          setupIntentClientSecret
        );
      } catch (error) {
        // Handle errors appropriately
        console.error('Failed to provide setup intent client secret:', error);
      }
    }
  );
};
```

**If the event includes parameters from native:**

```typescript
setupIntentClientSecretProviderCallback = addListener(
  'onCustomerSessionProviderSetupIntentClientSecret',
  async ({ customerId }) => { // Destructure parameters
    const setupIntentClientSecret =
      await clientSecretProvider.provideSetupIntentClientSecret(customerId);

    await NativeStripeSdk.clientSecretProviderSetupIntentClientSecretCallback(
      setupIntentClientSecret
    );
  }
);
```

**Important:** Don't forget to clean up listeners when the component unmounts or is reconfigured.

### Step 5: Complete the Native Callback Implementation

Resume the async operation started in Step 1 with the data from JavaScript.

#### Android Implementation

**File:** `android/src/main/java/com/reactnativestripesdk/StripeSdkModule.kt`

```kotlin
override fun clientSecretProviderSetupIntentClientSecretCallback(
  setupIntentClientSecret: String,
  promise: Promise
) {
  customerSheetFragment?.let {
    // Resume the coroutine with the result from JavaScript
    it.customerSessionProvider?.provideSetupIntentClientSecretCallback?.resume(
      Result.success(setupIntentClientSecret)
    )
    promise.resolve(null)
  } ?: run {
    promise.reject(
      "CustomerSheetNotInitialized",
      "Customer Sheet must be initialized before calling this callback"
    )
  }
}
```

#### iOS Implementation

**File:** `ios/StripeSdkImpl+CustomerSheet.swift`

```swift
@objc(clientSecretProviderSetupIntentClientSecretCallback:resolver:rejecter:)
public func clientSecretProviderSetupIntentClientSecretCallback(
  setupIntentClientSecret: String,
  resolver resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock
) -> Void {
  // Resume the continuation with the result from JavaScript
  self.clientSecretProviderSetupIntentClientSecretCallback?(setupIntentClientSecret)

  // Clear the callback
  self.clientSecretProviderSetupIntentClientSecretCallback = nil

  resolve([])
}
```

---

## Implementation Checklist

### Part 1: Simple Data Passing
- [ ] TypeScript types updated in `src/types/`
- [ ] Android parameter parsing implemented
- [ ] iOS parameter parsing implemented

### Part 2: Bidirectional Communication
- [ ] Event emission added in Android native code
- [ ] Event emission added in iOS native code
- [ ] Event type defined in `src/events.ts`
- [ ] Android emitter implemented in `EventEmitterCompat.kt`
- [ ] iOS emitter declared in `StripeSdkEmitter.swift`
- [ ] TypeScript callback spec added to `NativeStripeSdkModule.ts`
- [ ] Android callback spec added to `NativeStripeSdkModuleSpec.java`
- [ ] iOS bridge method added to `StripeSdk.mm`
- [ ] JavaScript event listener implemented in component
- [ ] Android callback completion implemented in `StripeSdkModule.kt`
- [ ] iOS callback completion implemented in Swift

### Testing & Documentation
- [ ] Unit tests written for TypeScript code
- [ ] Native tests written (iOS XCTest / Android)
- [ ] Example app updated to demonstrate feature
- [ ] E2E tests written using Maestro
- [ ] Code runs without linter errors (`yarn lint`)
- [ ] TypeScript compiles without errors (`yarn typescript`)
- [ ] Tested on both iOS and Android
- [ ] Tested with both Old and New Architecture

---

## Common Pitfalls

### Memory Leaks
**Problem:** Forgetting to remove event listeners.
**Solution:** Always call `.remove()` on subscriptions before creating new ones or when unmounting.

```typescript
useEffect(() => {
  // Setup listener
  const subscription = addListener('myEvent', handler);

  return () => {
    // Cleanup on unmount
    subscription?.remove();
  };
}, []);
```

### Missing Error Handling
**Problem:** Not handling errors in async callbacks.
**Solution:** Wrap callback logic in try-catch blocks and handle failures gracefully.

```typescript
async () => {
  try {
    const result = await userProvidedFunction();
    await NativeStripeSdk.callback(result);
  } catch (error) {
    console.error('Error:', error);
    // Consider how to communicate errors back to native
  }
}
```

### Thread Safety (iOS)
**Problem:** Updating UI from background threads.
**Solution:** Ensure UI updates happen on the main thread:

```swift
DispatchQueue.main.async {
  // UI updates here
}
```

### Incomplete Callback Resolution
**Problem:** Not calling `promise.resolve()` or `promise.reject()` in native code.
**Solution:** Always resolve or reject promises, even in error cases.

### Type Mismatches
**Problem:** TypeScript types don't match native expectations.
**Solution:** Use `UnsafeObject<T>` for complex types and validate in native code.

---

## Platform-Specific Considerations

### iOS
- **Async/Await:** Uses Swift continuations (`withCheckedThrowingContinuation`)
- **Callbacks:** Stored as optional closures (`((String) -> Void)?`)
- **Threading:** UI operations must run on main thread
- **Memory:** Be careful with retain cycles; use `[weak self]` when needed

### Android
- **Async/Await:** Uses Kotlin coroutines and `suspendCancellableCoroutine`
- **Callbacks:** Uses `CancellableContinuation` or `CompletableDeferred`
- **Threading:** React Native bridge handles threading automatically
- **Lifecycle:** Be aware of Activity/Fragment lifecycle when storing callbacks

---

## Additional Resources

- React Native TurboModules: https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules
- Stripe iOS SDK: https://stripe.dev/stripe-ios
- Stripe Android SDK: https://stripe.dev/stripe-android
