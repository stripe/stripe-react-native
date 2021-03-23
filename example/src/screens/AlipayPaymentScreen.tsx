import type { CreatePaymentMethod } from 'stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useConfirmPayment } from 'stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function AlipayPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'usd',
        items: [{ id: 'id' }],
        payment_method_types: ['alipay'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const {
      clientSecret,
      error: clientSecretError,
    } = await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const billingDetails: CreatePaymentMethod.BillingDetails = {
      name: 'John Doe',
    };

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Alipay',
      billingDetails,
      returnUrl: 'stripe-example://alipay',
      webview: true,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
    }
  };

  return (
    <Screen>
      <TextInput
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
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
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  text: {
    marginLeft: 12,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
    marginBottom: 20,
  },
});
