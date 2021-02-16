# Hooks

## useApplePay

A react hook for making ApplePay payments.

It returns an object with:

- `presentApplePay: (prams: PresentApplePayParams) => Promise<Result<{}, PresentApplePayError>>` - function to initiate apple payment. Read more in [presentApplePay](#presentapplepay) section.
- `confirmApplePayPayment: (clientSecret: string) => Promise<Result<{}, string>>` - function to complete payment. This function require clientSecret argument from you backend. Read more in [confirmApplePayPayment](#confirmApplePayPayment) section.
- `isApplePaySupported: boolean` - boolean value indicates if Apple Pay is supported on the device
- `loading: boolean` - state that indicates the status of the payment

Usage example:

```tsx
function PaymentScreen() {
  const {
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  } = useApplePay();

  // ...

  const pay = async () => {
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
      return;
    }
    const clientSecret = await fetchPaymentIntentClientSecret(); // fetch client secret from backend
    const { error: confirmError } = await confirmApplePayPayment(clientSecret);

    if (confirmError) {
      //handle error
    }
    // ...
  };

  // ...
}
```

## useConfirmPayment

A react hook for confirming simple payments with webhooks.

It returns an object with:

- `confirmPayment: (paymentIntentClientSecret: string, data: PaymentMethodData, options?: PaymentMethodOptions ) => Promise<Result<{ paymentIntent: PaymentIntent }, ConfirmPaymentError>>` - confirms the PaymentIntent with the provided parameters. Call this method if you are using automatic confirmation. Read more in [confirmPayment](#confirmpayment) section.
- `loading: boolean` - state that indicates the status of the payment

Usage example:

```tsx
function PaymentScreen() {
  const { confirmPayment, loading } = useConfirmPayment();

  // ...

  const handlePayPress = () => {
    const clientSecret = await fetchPaymentIntentClientSecret(); // fetching client secret from backend
    const billingDetails: BillingDetails = {
      email,
    }; // Gather customer billing information (ex. email)
    const { paymentIntent, error } = await confirmPayment(clientSecret, {
      type: 'Card',
      cardDetails: card,
      billingDetils,
    });

    if (error) {
      // handle error
    }
    // ...
  };

  // ..
}
```

## useConfirmSetupIntent

A react hook for confirming simple payments with webhooks.

It returns an object with:

- `confirmSetupIntent: ( paymentIntentClientSecret: string, data: PaymentMethodData, options?: PaymentMethodOptions ) => Promise<Result<{ setupIntent: SetupIntent }, ConfirmSetupIntentError>>` - confirms the Setup intent with the provided parameters. Read more in [confirmSetupIntent](#confirmsetupintent) section.
- `loading: boolean` - state that indicates the status of the payment

Usage example:

```tsx
function PaymentScreen() {
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  // ...

  const handlePayPress = () => {
    const clientSecret = await createSetupIntentOnBackend(); // creating setup intent on backend
    const billingDetails: BillingDetails = {
      email,
    };
    const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
      type: 'Card',
      cardDetails: card,
      billingDetails,
    });

    if (error) {
      // handle error
    }
    // ...
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
