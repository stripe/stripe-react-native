# Migration Guide

## Migrating from versions < 0.29.0

The legacy Apple Pay and Google Pay APIs (`useApplePay`, `useGooglePay`, `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, `createGooglePayPaymentMethod`, `<ApplePayButton />`, `<GooglePayButton />`) were removed in v0.29.0.

Use the Platform Pay API instead:

### `isApplePaySupported` / `isGooglePaySupported`

Replaced by `isPlatformPaySupported`:

```diff
- isGooglePaySupported(myParams);
+ isPlatformPaySupported({googlePay: myParams});
```

### `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, `createGooglePayPaymentMethod`

Replaced by:

- `confirmPlatformPaySetupIntent` — to confirm a setup intent
- `confirmPlatformPayPayment` — to confirm a payment intent
- `createPlatformPayPaymentMethod` — to create a payment method
- `createPlatformPayToken` — if migrating from Tipsi Stripe and using the legacy Tokens API

### `updateApplePaySummaryItems`

Replaced by `updatePlatformPaySheet`, which accepts an object with the `applePay` key containing `summaryItems`, `shippingMethods`, and `errors`.

### `useGooglePay` / `useApplePay`

Replaced by the `usePlatformPay` hook. Callbacks previously passed to `useApplePay` are now set via props on `<PlatformPayButton />`.

### `<GooglePayButton />` / `<ApplePayButton />`

Replaced by `<PlatformPayButton />`.

## Migrating from versions < 0.8.0

v0.8.0 changed parameters for `createPaymentMethod`, `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`.

### 1. Renamed `type` to `paymentMethodType`

Affects the first argument to `createPaymentMethod`, and the second argument to `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`.

### 2. Moved payment method data under `paymentMethodData`

All payment-method-specific fields now go under a nested `paymentMethodData` key:

```diff
- {
-   type: 'Card',
-   token: myToken,
-   billingDetails: myBillingDetails,
- }
+ {
+   paymentMethodType: 'Card',
+   paymentMethodData: {
+     token: myToken,
+     billingDetails: myBillingDetails,
+   },
+ }
```

This pattern applies to all payment method types (Ideal, SepaDebit, Bancontact, Klarna, etc.).

### 3. Moved `setupFutureUsage` to the `options` argument

`setupFutureUsage` is now passed as the third argument to `confirmPayment` and `confirmSetupIntent`, instead of the second.

### 4. Renamed `type` to `paymentMethodType` on result types

Affects `PaymentMethod.Result`, `PaymentIntent.Result`, and `SetupIntent.Result`.
