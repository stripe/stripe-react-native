import React, { useEffect, useState } from 'react';
import { useStripe } from 'stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function PaymentsUIBasicScreen() {
  const { setupPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { paymentIntent, ephemeralKey, customer } = await response.json();
    setClientSecret(paymentIntent);
    return {
      paymentIntent,
      ephemeralKey,
      customer,
    };
  };

  const openPaymentSheet = async () => {
    if (!clientSecret) {
      return;
    }
    const { error, paymentIntent } = await presentPaymentSheet(clientSecret);

    if (error) {
      console.log('error', error);
    } else if (paymentIntent) {
      setPaymentSheetEnabled(false);
      console.log('success', paymentIntent);

      initialisePaymentSheet();
    }
  };

  const initialisePaymentSheet = async () => {
    const {
      paymentIntent,
      ephemeralKey,
      customer,
    } = await fetchPaymentSheetParams();

    const { error } = await setupPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      customFlow: false,
      merchantDisplayName: 'Example Inc.',
      style: 'alwaysDark',
    });
    if (!error) {
      setPaymentSheetEnabled(true);
    }
  };

  useEffect(() => {
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    initialisePaymentSheet();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Button
        variant="primary"
        loading={!paymentSheetEnabled}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </Screen>
  );
}
