# Hooks

## use3dSecureConfiguration

A React hook that accepts a configuration to 3D secure UI.

Possible configuration options:

```ts
type ThreeDSecureConfigurationParams = {
  bodyFontSize?: number; // font size of the text - default `11`
  bodyTextColor?: string; // color of the text - default `#000000`
  headingFontSize?: number; // font size of the text in header - default `21`
  headingTextColor?: string; // color size of the text in header - default `#000000`
  timeout?: number; // timeout value in minutes - default `5`
};
```

Usage example:

```tsx
function PaymentScreen() {
  use3dSecureConfiguration({
    timeout: 5,
    headingTextColor: '#90b43c',
    bodyTextColor: '#000000',
    bodyFontSize: 16,
    headingFontSize: 21,
  });

  // ...
}
```

## useApplePay

A react hook for making ApplePay payments. It accepts `onError` and `onSuccess` callbacks.

It returns an object with:

- `presentApplePay: (prams: PresentApplePayParams) => Promise<void>` - function to initiate apple payment. Read more in [presentApplePay](#presentapplepay) section.
- `confirmApplePayPayment: (clientSecret: string) => Promise<void>` - function to complete payment. This function require clientSecret argument from you backend. Read more in [confirmApplePayPayment](#confirmApplePayPayment) section.
- `isApplePaySupported: boolean` - boolean value indicates if Apple Pay is supported on the device
- `loading: boolean` - state that indicates the status of the payment

Possible configuration options:

- `onError: (error: StripeError<PresentApplePayError>) => void` - callback that will be called on payment error
- `onSuccess: () => void` - callback that will be called on payment success

Usage example:

```tsx
function PaymentScreen() {
  const {
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  } = useApplePay({
    onSuccess: () => console.log('Successfully payed'),
  });

  // ...

  const pay = async () => {
    try {
      await presentApplePay({
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
      const clientSecret = await fetchPaymentIntentClientSecret(); // fetch client secret from backend
      await confirmApplePayPayment(clientSecret);
      // ...
    } catch (e) {
      // ...
    }
  };

  // ...
}
```

## useConfirmPayment

A react hook for confirming simple payments with webhooks. It that accepts `onError` and `onSuccess` callbacks.

It returns an object with:

- `confirmPayment: (paymentIntentClientSecret: string, data: PaymentMethodData, options?: PaymentMethodOptions ) => Promise<PaymentIntent>` - confirms the PaymentIntent with the provided parameters. Call this method if you are using automatic confirmation. Read more in [confirmPayment](#confirmpayment) section.
- `loading: boolean` - state that indicates the status of the payment

Configuration options you can set:

- `onError: (error: StripeError<ConfirmPaymentError>) => void` - callback that will be called on payment error
- `onSuccess: (intent: PaymentIntent) => void` - callback that will be called on payment success

Usage example:

```tsx
function PaymentScreen() {
  const { confirmPayment, loading } = useConfirmPayment({
    onSuccess: (intent) => console.log('Success', intent),
  });

  // ...

  const handlePayPress = () => {
    const clientSecret = await fetchPaymentIntentClientSecret(); // fetching client secret from backend
    try {
      const billingDetails: BillingDetails = {
        email,
      }; // Gather customer billing information (ex. email)
      const intent = await confirmPayment(clientSecret, {
        type: 'Card',
        cardDetails: card,
        billingDetils,
      });
      // ...
    } catch (e) {
      // ...
    }
  };

  // ..
}
```

## useConfirmSetupIntent

A react hook for confirming simple payments with webhooks. It that accepts `onError` and `onSuccess` callbacks.

It returns an object with:

- `confirmSetupIntent: ( paymentIntentClientSecret: string, data: PaymentMethodData, options?: PaymentMethodOptions ) => Promise<SetupIntent>` - confirms the Setup intent with the provided parameters. Read more in [confirmSetupIntent](#confirmsetupintent) section.
- `loading: boolean` - state that indicates the status of the payment

Configuration options you can set:

- `onError: (error: StripeError<ConfirmSetupIntentError>) => void` - callback that will be called on payment error
- `onSuccess: (intent: SetupIntent) => void` - callback that will be called on payment success

Usage example:

```tsx
function PaymentScreen() {
  const { confirmSetupIntent, loading } = useConfirmSetupIntent({
    onSuccess: (setupIntent) => console.log('Success', setupIntent),
  });

  // ...

  const handlePayPress = () => {
    try {
      const clientSecret = await createSetupIntentOnBackend(); // creating setup intent on backend
      const billingDetails: BillingDetails = {
        email,
      };
      const intent = await confirmSetupIntent(clientSecret, {
        type: 'Card',
        cardDetails: card,
        billingDetails,
      });
      // ...
    } catch (e) {
      // ...
    }
  };

  // ...
}
```

## useStripe

A react hook that returns a Stripe instance with all stripe methods.
See the content of returned object in [Stripe](#api-reference---stripe) section.

Usage example:

```tsx
function PaymentScreen() {
  const { createPaymentMethod, handleCardAction } = useStripe();

  // ...
}
```
