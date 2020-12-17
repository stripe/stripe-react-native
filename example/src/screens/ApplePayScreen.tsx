import React, { useCallback } from 'react';
import { Alert, StyleSheet } from 'react-native';
import {
  ApplePayButton,
  StripeError,
  useApplePay,
} from 'react-native-stripe-sdk';
import type { PayWithApplePayError } from 'src/types';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function ApplePayScreen() {
  const {
    payWithApplePay,
    completePaymentWithApplePay,
    isApplePaySupported,
  } = useApplePay({
    onError: (error) => {
      Alert.alert(error.code, error.message);
    },
    onSuccess: () => {
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
        force3dSecure: true,
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);

  const pay = async () => {
    await payWithApplePay([{ label: 'Example item name', amount: '10500.50' }]);
    const clientSecret = await fetchPaymentIntentClientSecret();

    try {
      await completePaymentWithApplePay(clientSecret);
      // success
    } catch (e) {
      const error: StripeError<PayWithApplePayError> = e;
      Alert.alert(error.code, error.message);
    }
  };

  return (
    <Screen>
      {isApplePaySupported && (
        <ApplePayButton onPress={pay} style={styles.payButton} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  payButton: {
    width: '50%',
    height: 50,
    marginTop: 60,
    alignSelf: 'center',
  },
});
