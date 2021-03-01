import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useStripe } from 'stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function ReCollectCVCScreen() {
  const [cvc, setCvc] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [loading, setLoading] = useState(false);

  const { confirmPayment } = useStripe();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(
      `${API_URL}/create-payment-intent-with-payment-method`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency: 'usd',
          items: [{ id: 'id' }],
          request_three_d_secure: 'any',
          // e-mail of the customer which has set up payment method
          email,
        }),
      }
    );
    const { clientSecret, paymentMethodId, error } = await response.json();

    return { clientSecret, paymentMethodId, error };
  };

  const handlePayPress = async () => {
    if (!cvc || !email) {
      return;
    }
    setLoading(true);

    // 1. fetch Intent Client Secret from backend
    const {
      clientSecret,
      paymentMethodId,
      error: paymentIntentError,
    } = await fetchPaymentIntentClientSecret();

    if (paymentIntentError) {
      Alert.alert('Error', paymentIntentError);
      setLoading(false);
      return;
    }

    // 2. Confirm payment with CVC
    // The rest will be done automatically using webhooks
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Card',
      cvc: cvc,
      paymentMethodId,
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
    setLoading(false);
  };

  return (
    <Screen>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
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
        disabled={!email || !cvc}
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
