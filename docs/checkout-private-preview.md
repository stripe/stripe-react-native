# Checkout private preview

The Checkout bridge forwards configuration, mutations, and session snapshots to the native SDKs. Native SDKs own payment selection and session rules.

`useCheckout` owns its controller. It destroys the controller on disable, reload, and unmount. `reload()` uses the latest configuration callback. Stale configuration and creation results cannot replace the current controller.

After Checkout completes, start another payment with a new Checkout Session and controller. The controller's `ready` status means no operation is running; check `session.status` for the session's lifecycle. In the playground, **Reload** creates a new session and controller unless the configuration supplies a `clientSecret`.

`runServerUpdate` starts the native update before it calls the merchant callback. Each completion includes a controller ID and an operation ID. Native SDKs enforce the callback timeout and refresh the session. Destruction releases pending callbacks. Late and duplicate completions have no effect.

## Playground

1. Build the example app.
2. Open **Accept a payment → Checkout Sessions (private preview)**.
3. Select **Create session**.
4. Use **Edit configuration** to change any configuration field or session creation parameter.
5. Select **Reload** to apply the configuration.
6. Open **Session updates** for mutations and server updates.
7. Select **Show inline element** to render the native Payment Element.
8. Select **Present sheet** to open the native sheet.
9. Select **Reset** to destroy the controller.

The playground uses the shared native test backend. Its default UI mode matches each native playground: `elements` on Android and `mobile_elements` on iOS. An explicit `clientSecret` in the configuration skips session creation. A server update URL receives a POST request with `session_id`. An empty URL exercises native refresh without a server mutation.

The screen shows the native status, last operation, and session snapshot. It replaces Base64 images with a label in the snapshot display.

## Native dependencies still required

The full proposed API is not available in the released native SDKs. The wrapper does not infer native results or reproduce missing payment behavior.

| Operation | Native gap |
| --- | --- |
| iOS email mutation | `CheckoutController.updateEmail` is absent in the pinned iOS 26.9.0 API and in 26.11.0. |
| Android confirmation | SDK 23.19.0 can omit callbacks for invalid attempts and some cancellations. RN forwards the controller callback; affected promises remain pending until a callback arrives or the controller is destroyed. |
| Android clearing shipping | The native method requires a non-null address. `address: null` is unsupported. |
| Typed mutation errors | The iOS Checkout error type is internal, and Android uses generic exceptions for several failures. These errors map to `Failed`; cancellation is preserved, and Android timeout exceptions map to `Timeout`. |
| Configuration | Optional fields unavailable in the native SDK are ignored. Android ignores phone defaults, save opt-in behavior, root font/shapes, and embedded row appearance overrides. iOS billing collection applies address only; name, phone, and attach-defaults overrides are ignored. |

Android appearance supports colors, primary-button settings, and partial form insets using native theme defaults. Configure Android billing collection on the Checkout Session. Native Android selects the Google Pay environment from the session and SDK build type, so `googlePay.testEnv` is ignored.

`returnURL` is used on iOS. Android uses native SDK redirect handling. Native iOS takes the Apple Pay merchant country from the Checkout Session; `applePay.merchantCountryCode` does not override it.

Sheet presentation resolves immediately after the native call on both platforms. It does not wait for dismissal.

The confirmation control calls native Checkout on both platforms and displays completed, canceled, or failed results. Android includes paymentStatus when the native session reports it.

Master requires the new React Native architecture. The inline component uses codegen and Fabric. Legacy architecture support remains a separate scope decision.
