# `isApplePaySupported` and `isGooglePaySupported`

`isApplePaySupported` and `isGooglePaySupported` have both been replaced by `isPlatformPaySupported`.

`isPlatformPaySupported` requires no parameters, but you _can_ optionally pass in the same parameter you passed in to `isGooglePaySupported`. However, this now belongs under the `googlePay` field. So the change would look like:

```diff
- isGooglePaySupported(myParams);
+ isPlatformPaySupported({googlePay: myParams});
```

# `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, and `createGooglePayPaymentMethod`

`presentApplePay`, `confirmApplePayPayment`, `isGooglePaySupported`, `presentGooglePay`, and `createGooglePayPaymentMethod` have been replaced with:

- `confirmPlatformPaySetupIntent` if you were using them to confirm a setup intent
- `confirmPlatformPayPayment` if you were using them to confirm a payment intent
- `createPlatformPayPaymentMethod` if you were using them to create a payment method (this was impossible previously with Apple Pay, so it was only possible on Android).
- `createPlatformPayToken` if you are migrating from Tipsi Stripe and your payments code still uses the legacy Tokens API.

# `updateApplePaySummaryItems`

`updateApplePaySummaryItems` has been replaced with `updatePlatformPaySheet`.

`updatePlatformPaySheet` accepts an object with the `applePay` key. Under that key, you can pass an object containing your `summaryItems`, `shippingMethods`, and `errors` to be displayed in the Apple Pay sheet so your customer can take action during checkout.

# `useGooglePay` and `useApplePay`

`useGooglePay` and `useApplePay` have both been replaced by the `usePlatformPay` hook. The callbacks passed to the `useApplePay` hook are now set via props on the `<PlatformPayButton />` component.

# `<GooglePayButton />` and `<ApplePayButton />`

The `<GooglePayButton />` and `<ApplePayButton />` components have been replaced with `<PlatformPayButton />`.
