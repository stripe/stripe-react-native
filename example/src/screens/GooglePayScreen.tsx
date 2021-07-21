import React, { useEffect, useState } from 'react';
import { useGooglePay } from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { Alert, StyleSheet, View } from 'react-native';

export default function GooglePayScreen() {
  const {
    initGooglePay,
    presentGooglePay,
    loading,
    createGooglePayPaymentMethod,
  } = useGooglePay();
  const [initialized, setInitialized] = useState(false);

  const fetchPaymentIntentClientSecret = async () => {
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
  };

  const pay = async () => {
    // 2. Fetch payment intent client secret
    const clientSecret = await fetchPaymentIntentClientSecret();

    // 3. Open Google Pay sheet and proceed a payment
    const { error } = await presentGooglePay({
      clientSecret,
      forSetupIntent: false,
    });

    if (error) {
      Alert.alert(error.code, error.message);
      return;
    }
    Alert.alert('Success', 'The payment was confirmed successfully.');
    setInitialized(false);
  };

  /*
    As an alternative you can only create a paymentMethod instead of confirming the payment.
  */
  const createPaymentMethod = async () => {
    const { error, paymentMethod } = await createGooglePayPaymentMethod({
      amount: 12,
      currencyCode: 'USD',
    });

    if (error) {
      Alert.alert(error.code, error.message);
      return;
    } else if (paymentMethod) {
      Alert.alert(
        'Success',
        `The payment method was created successfully. paymentMethodId: ${paymentMethod.id}`
      );
    }
    setInitialized(false);
  };

  useEffect(() => {
    // 1. Initialize Google Pay
    async function initialize() {
      const { error } = await initGooglePay({
        testEnv: true,
        createPaymentMethod: true,
        merchantName: 'Test',
        countryCode: 'US',
        billingAddressConfig: {
          format: 'FULL',
          isPhoneNumberRequired: true,
          isRequired: false,
        },
        existingPaymentMethodRequired: false,
        isEmailRequired: true,
      });

      if (error) {
        Alert.alert(error.code, error.message);
        return;
      }
      setInitialized(true);
    }
    initialize();
  }, [initGooglePay]);

  return (
    <PaymentScreen>
      <Button
        disabled={!initialized}
        onPress={pay}
        loading={loading}
        variant="primary"
        title="Pay with Google Pay"
      />
      <View style={styles.row}>
        <Button
          disabled={!initialized}
          onPress={createPaymentMethod}
          loading={loading}
          variant="primary"
          title="Crete payment method"
        />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 30,
  },
});
