import type { PaymentMethod } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, TextInput, StyleSheet } from 'react-native';
import {
  useConfirmPayment,
  createPaymentMethod,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function AffirmScreen() {
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
        items: ['id-5'],
        payment_method_types: ['affirm'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const shippingDetails: PaymentMethod.ShippingDetails = {
      address: {
        city: 'Houston',
        country: 'US',
        line1: '1459 Circle Drive',
        postalCode: '77063',
        state: 'Texas',
      },
      name: 'John Doe',
    };

    console.log('hi');
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Affirm',
      paymentMethodData: {
        shippingDetails,
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
    }
  };

  const handleCreatePaymentMethodPress = async () => {
    const { paymentMethod, error } = await createPaymentMethod({
      paymentMethodType: 'Affirm',
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      return;
    } else {
      Alert.alert('Success', `Payment method id: ${paymentMethod?.id}`);
    }
  };

  return (
    <PaymentScreen>
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
        loading={loading}
      />
      <Button
        variant="primary"
        onPress={handleCreatePaymentMethodPress}
        title="Create payment method"
        accessibilityLabel="Create payment method"
        loading={loading}
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
