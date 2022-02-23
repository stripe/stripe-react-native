import type { PaymentMethodCreateParams } from '@stripe/stripe-react-native';
import React from 'react';
import { Alert } from 'react-native';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function AffirmPaymentScreen() {
  const { confirmPayment, loading } = useConfirmPayment();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id-5' }],
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

    const shippingDetails: PaymentMethodCreateParams.ShippingDetails = {
      addressLine1: '1459 Circle Drive',
      addressCity: 'Houston',
      addressState: 'Texas',
      addressCountry: 'US',
      addressPostalCode: '77063',
      name: 'John Doe',
    };

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Affirm',
      shippingDetails,
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

  return (
    <PaymentScreen>
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
        loading={loading}
      />
    </PaymentScreen>
  );
}
