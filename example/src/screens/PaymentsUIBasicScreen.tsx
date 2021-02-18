import React, { useEffect, useState } from 'react';
import { useStripe } from 'stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function PaymentsUIBasicScreen() {
  const { setupPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { paymentIntent, ephemeralKey, customer } = await response.json();

    return {
      paymentIntent,
      ephemeralKey,
      customer,
    };
  };

  const openSheet = async () => {
    try {
      const res = await presentPaymentSheet();
      setPaymentSheetEnabled(false);
      console.log('success', res);

      setup();
    } catch (error) {
      console.log('error', error);
    }
  };

  const setup = async () => {
    const {
      paymentIntent,
      ephemeralKey,
      customer,
    } = await fetchPaymentSheetParams();

    await setupPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      custom: false,
    });
    setPaymentSheetEnabled(true);
  };

  useEffect(() => {
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    setup();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Button
        variant="primary"
        loading={!paymentSheetEnabled}
        title="Checkout"
        onPress={openSheet}
      />
    </Screen>
  );
}
