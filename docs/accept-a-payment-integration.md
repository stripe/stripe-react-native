# Accept a payment - integration builder

## Step by step

### 1. Set up the server

### 2. Build a checkout page on the client

#### 2.A. Install the SDK

To install the SDK run the following command in your terminal:

```sh
yarn add react-native-stripe-sdk
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

#### 2.B. Configure the SDK

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application.

#### 2.C. Create a payment form

Securely collect card information on the client with `CardField` component.

Add `CardField` component to your payment screen. To collect card details you can use `onCardChange` prop and keep received data in the component state. To set the default value for the card `defaultValue` prop can be used.

#### 2.D. Create a function to fetch a PaymentIntent

Create a function that will make a request to your server for a PaymentIntent. The client secret from it will be needed before confirming the payment.

#### 2.E. Use `useConfirmPayment` hook

To get access to `confirmPayment` function use `useConfirmPayment` hook at the top of your component.

### 3. Complete the payment on the client

#### 3.A. Fetch the PaymentIntent client secret

When the customer clicks the pay button fetch the PaymentIntent client secret using the function created earlier.

#### 3.B. Finish the payment

Send the card details and client secret to Stripe by calling `confirmPayment()` method you get from `useConfirmPayment` hook.
To indicate payment loading status you can use `loading` value from this hook as well.

#### 3.C. Handle the response from Stripe

There are two ways to handle success or failure response from `confirmPayment` call. This function returns the promise so you use it to communicate the customer about the error or success.

The other way is to use `onError` and `onSuccess` callbacks you can pass to the `useConfirmPayment` hook.

### 4. Test the integration

## Code

```tsx
// WebhookPaymentScreen.tsx

import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  CardDetails,
  CardField,
  useConfirmPayment,
} from 'react-native-stripe-sdk';
import Button from '../components/Button';
import { API_URL } from '../Config';

const defaultCard = {
  number: '4242424242424242',
  cvc: '424',
  expiryMonth: 1,
  expiryYear: 22,
};

export default function WebhookPaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  // 2.E. ------
  const { confirmPayment, loading } = useConfirmPayment({
    // 3.C. ------
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
    onSuccess: (intent) => {
      console.log('Success', intent);
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! curerency: ${intent.status}`
      );
    },
    //--------
  });
  // --------

  // 2.D. ------
  const fetchPaymentIntentClientSecret = useCallback(async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id' }],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);
  // ----------

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    const billingDetails: BillingDetails = {
      email,
    }; // Gather customer billing information (ex. email)

    try {
      // 3.A. ------
      const clientSecret = await fetchPaymentIntentClientSecret();
      // ----------

      // 3.B. ------
      const intent = await confirmPayment(clientSecret, {
        type: 'Card',
        cardDetails: card,
        billingDetails,
      });
      console.log('Success from promise', intent);
      // --------
    } catch (e) {
      console.log('Paymentconfirmation error', e.message);
    }
  }, [card, confirmPayment, fetchPaymentIntentClientSecret]);

  return (
    <View>
      {/* 2.C. ------ */}
      <CardField
        defaultValue={defaultCard}
        postalCodeEnabled={true}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
      />
      {/* ---------- */}
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
    </View>
  );
}
```

```tsx
// App.tsx

import WebhookPaymentScreen from './WebhookPaymentScreen';
import StripeProvider from 'react-native-stripe-sdk';

export default function App() {
  // 2.A. ------
  <StripeProvider publishableKey="pk_test_51Ho4m5A51v44wNexXNFEg0MSAjZUzllhhJwiFmAmJ4tzbvsvuEgcMCaPEkgK7RpXO1YI5okHP08IUfJ6YS7ulqzk00O2I0D1rT">
    <WebhookPaymentScreen />
  </StripeProvider>;
  // ----------
}
```
