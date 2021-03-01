import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BillingDetails,
  CardDetails,
  CardField,
  useConfirmPayment,
} from 'stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function CVCRecollectionScreen() {
  const [cvc, setCvc] = useState<string>();

  const { confirmPayment, loading } = useConfirmPayment();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id' }],
        request_three_d_secure: 'any',
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    if (!cvc) {
      return;
    }

    // 1. fetch Intent Client Secret from backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    // 2. Confirm payment with CVC
    // The rest will be done automatically using webhooks
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Card',
      cvc: cvc,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
      console.log('Success from promise', paymentIntent);
    }
  };

  return (
    <Screen>
      <TextInput
        style={styles.input}
        placeholder="CVC"
        onChange={(value) => setCvc(value.nativeEvent.text)}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
    marginBottom: 20,
  },
});
