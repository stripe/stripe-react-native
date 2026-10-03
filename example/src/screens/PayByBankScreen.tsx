import type { BillingDetails } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function PayByBankScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading: loadingPayment } = useConfirmPayment();

  const fetchClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'gbp',
        payment_method_types: ['pay_by_bank'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const billingDetails: BillingDetails = {
      name: 'John Doe',
      email,
    };

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'PayByBank',
      paymentMethodData: {
        billingDetails,
      },
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
    <PaymentScreen paymentMethod="pay_by_bank">
      <TextInput
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />

      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
        loading={loadingPayment}
      />
    </PaymentScreen>
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
