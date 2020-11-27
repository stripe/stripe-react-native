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

export default function WebhookPaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  use3dSecureConfiguration({ timeout: 5, headingTextColor: '#90b43c' });

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
        force3dSecure: true,
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
        value={{
          cardNumber: '4000000000003238',
          cvc: '424',
          expiryMonth: 5,
          expiryYear: 22,
        }}
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
