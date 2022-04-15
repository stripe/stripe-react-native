import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function CVCReCollectionScreen() {
  const [cvc, setCvc] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [loading, setLoading] = useState(false);

  const { confirmPayment, createTokenForCVCUpdate } = useStripe();

  const fetchPaymentIntentWithPaymentMethod = async () => {
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

  const callNoWebhookPayEndpoint = async (data: {
    useStripeSdk: boolean;
    cvcToken: string;
    currency: string;
    items: { id: string }[];
    email: string;
  }) => {
    const response = await fetch(`${API_URL}/pay-without-webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const payAsynchronously = async () => {
    if (!cvc || !email) {
      return;
    }
    setLoading(true);

    // 1. fetch Intent Client Secret from backend
    const {
      clientSecret,
      paymentMethodId,
      error: paymentIntentError,
    } = await fetchPaymentIntentWithPaymentMethod();

    if (paymentIntentError) {
      Alert.alert('Error', paymentIntentError);
      setLoading(false);
      return;
    }

    // 2. Confirm payment with CVC
    // The rest will be done automatically using webhooks
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: {
        cvc,
        paymentMethodId,
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
    }
    setLoading(false);
  };

  const paySynchronously = async () => {
    if (!cvc || !email) {
      return;
    }
    setLoading(true);

    const { tokenId, error } = await createTokenForCVCUpdate(cvc);
    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      return;
    } else if (tokenId) {
      const paymentIntent = await callNoWebhookPayEndpoint({
        useStripeSdk: true,
        currency: 'usd',
        items: [{ id: 'id' }],
        cvcToken: tokenId,
        email,
      });
      console.log('paymentIntent', paymentIntent);
      if (paymentIntent.error) {
        Alert.alert('Error', paymentIntent.error);
      } else if (paymentIntent.status === 'succeeded') {
        Alert.alert('Success', 'The payment was confirmed successfully!');
      } else {
        // Handle other statuses accordingly
      }
    }
    setLoading(false);
  };

  return (
    <PaymentScreen>
      <TextInput
        autoCapitalize="none"
        style={styles.input}
        placeholder="E-mail"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
      <TextInput
        keyboardType="number-pad"
        style={styles.input}
        placeholder="CVC"
        value={cvc}
        onChange={(value) => setCvc(value.nativeEvent.text)}
      />
      <View style={styles.section}>
        <Text style={styles.title}>Webhook payment</Text>

        <Button
          variant="primary"
          onPress={payAsynchronously}
          title="Pay"
          accessibilityLabel="Pay"
          loading={loading}
          disabled={!email || !cvc}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Synchronous payment</Text>

        <Button
          variant="primary"
          onPress={paySynchronously}
          title="Pay Synchronously"
          loading={loading}
          disabled={!cvc}
        />
      </View>
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
  title: {
    fontWeight: '600',
    marginBottom: 12,
  },
  section: {
    marginVertical: 30,
  },
});
