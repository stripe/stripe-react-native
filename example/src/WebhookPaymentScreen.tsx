import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';
import {
  CardDetails,
  CardFieldNative,
  useConfirmPayment,
} from 'react-native-stripe-sdk';
import { API_URL } from './Config';

export default function WebhookPaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);
  const { confirmPayment, loading } = useConfirmPayment({
    onError: (message) => {
      Alert.alert('Error', message);
    },
    onSuccess: (intent) => {
      console.log('Success', intent);
      Alert.alert('Success', 'The payment was confirmed successfully!');
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
      // The reset will be done automatically using webhooks
      const intent = await confirmPayment(clientSecret, card);
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Paymentconfirmation error', e);
    }
  }, [card, confirmPayment, fetchPaymentIntentClientSecret]);

  return (
    <View>
      <CardFieldNative
        value={{
          cardNumber: '4242424242424242',
          cvc: '424',
          expiryMonth: '03',
          expiryYear: '22',
        }}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          console.log('card details', cardDetails.nativeEvent);
          setCard(cardDetails.nativeEvent);
        }}
        onFocus={(focusField) => {
          console.log('focusField', focusField.nativeEvent.focusField);
        }}
        style={styles.cardField}
      />
      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardField: {
    marginTop: 300,
    width: '100%',
    height: 50,
  },
});
