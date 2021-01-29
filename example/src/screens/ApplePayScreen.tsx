import React, { useCallback } from 'react';
import { Alert, StyleSheet } from 'react-native';
import {
  ApplePayButton,
  StripeError,
  useApplePay,
  PresentApplePayError,
} from 'stripe-react-native';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function ApplePayScreen() {
  const {
    presentApplePay,
    confirmApplePayPayment,
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
    await presentApplePay([{ label: 'Example item name', amount: '10500.50' }]);
    const clientSecret = await fetchPaymentIntentClientSecret();

    try {
      await confirmApplePayPayment(clientSecret);
      // success
    } catch (e) {
      const error: StripeError<PresentApplePayError> = e;
      Alert.alert(error.code, error.message);
    }
  };

  return (
    <Screen>
      {isApplePaySupported && (
        <ApplePayButton
          onPress={pay}
          type="plain"
          buttonStyle="black"
          style={styles.payButton}
        />
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
