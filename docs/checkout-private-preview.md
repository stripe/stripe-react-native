# Checkout private preview

The Checkout bridge forwards configuration, mutations, and session snapshots to the native SDKs. Native SDKs own payment selection and session rules.

`useCheckout` owns its controller. It destroys the controller on disable, reload, and unmount. `reload()` uses the latest configuration callback. Stale configuration and creation results cannot replace the current controller.

After Checkout completes, start another payment with a new Checkout Session and controller. The controller's `ready` status means that no operation is active. Read `session.status` for the session lifecycle.

`runServerUpdate` starts the native update before it calls the merchant callback. Each completion includes a controller ID and an operation ID. Native SDKs enforce the callback timeout and refresh the session. Destruction releases pending callbacks. Late and duplicate completions have no effect.

## Playground

1. Build the example app.
2. Open **Accept a payment → Checkout Sessions (private preview)**.
3. Set the Checkout Session configuration.
4. Select **Create Checkout Session**.
5. Select **Select payment method** to open the Payment Element.
6. Add a shipping address if the configuration collects one.
7. Select **Buy** to confirm the Checkout Session.
8. Open **Session diagnostics** to examine the session snapshot.
9. Close the cart to return to the configuration.

The playground uses the shared native test backend. Its default UI mode is `elements` on Android and `mobile_elements` on iOS. The playground saves its configuration on the device.

The playground follows the stripe-ios flow. The configuration screen creates the session, and a separate cart screen owns the Checkout controller.

The cart supports Payment Element sheet and view modes. It also supports local email changes, shipping address changes, confirmation, and session diagnostics.

The React Native API does not expose Express Checkout Element or Currency Selector Element. The configuration screen identifies these unavailable elements.

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
