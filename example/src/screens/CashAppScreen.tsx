import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import {
  useConfirmPayment,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function CashAppScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading: loadingPayment } = useConfirmPayment();
  const { confirmSetupIntent, loading: loadingSetup } = useConfirmSetupIntent();

  const fetchClientSecret = async (intentType: 'setup' | 'payment') => {
    const response = await fetch(`${API_URL}/create-${intentType}-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'usd',
        payment_method_types: ['cashapp'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchClientSecret('payment');

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'CashApp',
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

  const handleSetupPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchClientSecret('setup');

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      paymentMethodType: 'CashApp',
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert('Success', `Status: ${setupIntent.status}`);
      console.log('Success from promise', setupIntent);
    }
  };

  return (
    <PaymentScreen paymentMethod="cashapp">
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

      <Button
        variant="primary"
        onPress={handleSetupPress}
        title="Setup for later"
        accessibilityLabel="Setup for later"
        loading={loadingSetup}
      />
    </PaymentScreen>
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
    marginVertical: 20,
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
