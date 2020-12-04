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
  cardNumber: '4242424242424242',
  cvc: '424',
  expiryMonth: 1,
  expiryYear: 22,
};

export default function WebhookPaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

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
      // The rest will be done automatically using webhooks
      const intent = await confirmPayment(clientSecret, card);
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Paymentconfirmation error', e.message);
    }
  }, [card, confirmPayment, fetchPaymentIntentClientSecret]);

  return (
    <View style={styles.container}>
      <CardField
        defaultValue={defaultCard}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusField', focusedField);
        }}
        style={styles.cardField}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
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
    marginBottom: 20,
  },
});
