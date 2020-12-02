import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';
import {
  CardDetails,
  CardField,
  useConfirmPayment,
  use3dSecureConfiguration,
} from 'react-native-stripe-sdk';
import { API_URL } from './Config';

const defaultCard = {
  cardNumber: '4000000000003238',
  cvc: '424',
  expiryMonth: 1,
  expiryYear: 22,
};

export default function ThreeDSecureScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  use3dSecureConfiguration({
    timeout: 5,
    headingTextColor: '#90b43c',
    bodyTextColor: '#000000',
    bodyFontSize: 16,
    headingFontSize: 21,
  });

  const { confirmPayment, loading } = useConfirmPayment({
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
  });

  const fetchPaymentIntentClientSecret = useCallback(async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id' }],
        // We strongly recommend that you rely on our SCA Engine to automatically prompt your customers for authentication based on risk level and [other requirements](https://stripe.com/docs/strong-customer-authentication).
        // However, if you wish to request 3D Secure based on logic from your own fraud engine, provide this option. Permitted values include: `automatic` or `any`. If not provided, defaults to `automatic`.
        // Read our guide on [manually requesting 3D Secure](https://stripe.com/docs/payments/3d-secure#manual-three-ds) for more information on how this configuration interacts with Radar and our SCA Engine.
        request_three_d_secure: 'any',
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      // 1. fetch Intent Client Secret from backend
      const clientSecret = await fetchPaymentIntentClientSecret();

      // 2. Confirm payment with card details
      // The reset will be done automatically using webhooks
      const intent = await confirmPayment(clientSecret, card);
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Paymentconfirmation error', e.message);
    }
  }, [card, confirmPayment, fetchPaymentIntentClientSecret]);

  return (
    <View style={styles.container}>
      <CardField
        value={defaultCard}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusField', focusedField);
        }}
        style={styles.cardField}
      />
      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
});
