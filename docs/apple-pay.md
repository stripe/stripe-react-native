# Apple Pay

Stripe users can accept Apple Pay in React Native applications in iOS 9 and above. There are no additional fees to process Apple Pay payments, and the pricing is the same as other card transactions.

Apple Pay is compatible with most Stripe products and features (e.g., [subscriptions](https://stripe.com/docs/billing)), allowing you to use it in place of a traditional payment form whenever possible. Use it to accept payments for physical or digital goods, donations, subscriptions, and more (note that Apple Pay cannot be used instead of [in-app purchases](https://stripe.com/docs/apple-pay#using-stripe-and-apple-pay-vs-in-app-purchases)).

Apple Pay is available to cardholders at participating banks in supported countries. Refer to Apple’s participating banks documentation to learn which banks and countries are supported.

Apple Pay is available to cardholders at participating banks in supported countries. Refer to Apple’s [participating banks](https://support.apple.com/en-us/HT204916) documentation to learn which banks and countries are supported.

## Accept Apple Pay in your React Native app

Stripe’s [React Native SDK](https://github.com/stripe/stripe-react-native/) makes it easy to accept both Apple Pay and regular credit card payments. Before you start, you’ll need to be enrolled in the [Apple Developer Program](https://developer.apple.com/programs/) and [set up Stripe on your server and in your app](../README.md#stripe-initialisation). Next, follow these steps:

1. [Register for an Apple Merchant ID](https://stripe.com/docs/apple-pay#merchantid)
2. [Create a new Apple Pay certificate](https://stripe.com/docs/apple-pay#csr)
3. [Integrate with Xcode](https://stripe.com/docs/apple-pay#setup)
4. [Setup marchantId in StripeProvider](#step-4-set-up-merchantid-in-stripe-provider)
5. [Check if Apple Pay is supported](#step-5-check-if-apple-pay-is-supported)
6. [Present the payment sheet](#step-6-present-the-payment-sheet)
7. [Submit the payment to Stripe](#step-7-submit-the-payment-to-stripe)

## Step 4: Set up marchantId in Stripe Provider

Next, you need to set up previously registered marchantId in `StripeProvider` component.

```tsx
<StripeProvider
  publishableKey={publishableKey}
  merchantIdentifier="merchant.com.stripe.react.native"
  // ..
>
  <App>
</StripeProvider>
```

## Step 5: Check if Apple Pay is supported

Before displaying Apple Pay as a payment option in your app, determine if the user’s device supports Apple Pay and they have a card added to their wallet.

```tsx
function PaymentScreen() {
  const { isApplePaySupported } = useApplePay();

  // ...

  const pay = async () => {
    // ...
  };

  // ...

  return <View>{isApplePaySupported && <ApplePayButton onPress={pay} />}</View>;
}
```

## Step 6: Present the payment sheet

Use `useApplePay` hook to handle this kind of payment,
it returns `presentApplePay`, `confirmApplePayPayment` methods, `loading` value and `isApplePaySupported`.
It accepts `onDidSetShippingContactCallback` and `onDidSetShippingMethodCallback` callbacks as parameter which can be usefull for adjusting price for choosen shipping details.
When the user taps the Apple Pay button, call `presentApplePay` to open sheet.
In argument you should pass cart items which will be displayed in Apple Pay sheet.

```tsx
function PaymentScreen() {
  const { presentApplePay, isApplePaySupported } = useApplePay({
    onDidSetShippingMethodCallback: (shippingMethod, handler) => {
      handler([
        { label: 'Example item name 1', amount: '11.00' },
        { label: 'Example item name 2', amount: '25.00' },
      ]);
    },
    onDidSetShippingContactCallback: (shippingContact, handler) => {
      handler([
        { label: 'Example item name 1', amount: '92.00' },
        { label: 'Example item name 2', amount: '142.00' },
      ]);
    },
  });

  // ...

  const pay = async () => {
    if (!isApplePaySupported) return;
    // ...
    const { error } = await presentApplePay({
      items: [{ label: 'Example item name', amount: '14.00' }],
      country: 'US',
      currency: 'USD',
      shippingMethods: [
        {
          amount: '20.00',
          identifier: 'DPS',
          label: 'Courier',
          detail: 'Delivery',
          type: 'final',
        },
      ],
      requiredShippingAddressFields: ['emailAddress', 'phoneNumber'],
      requiredBillingContactFields: ['phoneNumber', 'name'],
    });
    if (error) {
      // handle error
    }
    // ...
  };
  // ...
}
```

When you are going to use `onDidSetShippingContactCallback` and `onDidSetShippingMethodCallback` callbacks you must remember
to call provided handler with updated summary items based on choosen shipping method/contact.

## Step 7: Submit the payment to Stripe

### Client side

On the client, request a PaymentIntent from your server and store its client secret.
Call `confirmApplePayPayment` with clientSecrect to complete the payment.

```tsx
function PaymentScreen() {
  const {
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  } = useApplePay();

  // ...

  const pay = async () => {
    if (!isApplePaySupported) return;

    const { error } = await presentApplePay({
      items: [{ label: 'Example item name', amount: '14.00' }],
      country: 'US',
      currency: 'USD',
      shippingMethods: [
        {
          amount: '20.00',
          identifier: 'DPS',
          label: 'Courier',
          detail: 'Delivery',
          type: 'final',
        },
      ],
      requiredShippingAddressFields: ['emailAddress', 'phoneNumber'],
      requiredBillingContactFields: ['phoneNumber', 'name'],
    });

    if (error) {
      // handle error
    } else {
      const clientSecret = await fetchPaymentIntentClientSecret();

      const { error: confirmError } = await confirmApplePayPayment(
        clientSecret
      );

      if (confirmError) {
        // handle error
      }
    }
  };
  // ...
}
```

## Optional - use `useStripe` hook instead of `useApplePay`

You can also use `useStripe` hook to confirm payment. This hook returns a whole list of stripe methods you can trigger. The only difference is that you will have to manage `loading` state by yourself.

## Testing Apple Pay

Stripe test card information can’t be saved to Wallet in iOS. Instead, Stripe recognizes when you’re using your test API keys and returns a successful test card token for you to use. This allows you to make test payments using a live card without it being charged.

You’re now ready to implement Apple Pay. If you’d like to read more about Apple Pay and its other configuration options, we recommend the NSHipster article on Apple Pay and the Apple Pay Within Apps presentation from WWDC 2015.

## See also

- [Troubleshooting](https://stripe.com/docs/apple-pay#troubleshooting)
- [Apple Pay Best Practices](https://stripe.com/docs/apple-pay/best-practices)
