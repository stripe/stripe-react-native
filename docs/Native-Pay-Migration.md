# `isApplePaySupported` and `isGooglePaySupported`

`isApplePaySupported` and `isGooglePaySupported` have both been replaced by `isNativePaySupported`.

`isNativePaySupported` requires no parameters, but you _can_ optionally pass in the same parameter you passed in to `isGooglePaySupported`. However, this now belongs under the `googlePay` field. So the change would look like:

```diff
- isGooglePaySupported(myParams);
+ isNativePaySupported({googlePay: myParams});
```

# `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, and `createGooglePayPaymentMethod`

`presentApplePay`, `confirmApplePayPayment`, `isGooglePaySupported`, `presentGooglePay`, and `createGooglePayPaymentMethod` have been replaced with:

- `confirmNativePaySetupIntent` if you were using them to confirm a setup intent
- `confirmNativePayPayment` if you were using them to confirm a payment intent
- `createNativePayPaymentMethod` if you were using them to create a payment method (this was impossible previously with Apple Pay, so it was only possible on Android). This method also now creates and returns the Stripe token object.

# `updateApplePaySummaryItems`

`updateApplePaySummaryItems` has been replaced with `updateApplePaySheet`.

`updateApplePaySheet` accepts the same first parameter: your cart items. The second parameter allows you to set new shipping methods, and the third parameter allows you to set specific errors in the Apple Pay sheet so your customer can take action during checkout.

# `useGooglePay` and `useApplePay`

`useGooglePay` and `useApplePay` have both been replaced by the `useNativePay` hook.

`useNativePay` allows you to take action when a customer inputs a coupon code (via the `onApplePayCouponCodeEntered` prop).
