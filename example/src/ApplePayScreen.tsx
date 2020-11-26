import React, { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ApplePayButton, useApplePay } from 'react-native-stripe-sdk';
import { API_URL } from './Config';

export default function ApplePayScreen() {
  const {
    payWithApplePay,
    completePaymentWithApplePay,
    isApplePaySupported,
  } = useApplePay({
    onError: (errorCode, message) => {
      Alert.alert(errorCode, message);
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
    completePaymentWithApplePay(clientSecret);
  };

  return (
    <View style={styles.container}>
      {isApplePaySupported && (
        <ApplePayButton onPay={pay} style={styles.payButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  payButton: {
    width: '50%',
    height: 50,
    marginTop: 60,
    alignSelf: 'center',
  },
});
