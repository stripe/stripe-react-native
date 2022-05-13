import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
  useStripe,
  BillingDetails,
  Address,
  PaymentSheetError,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { Platform } from 'react-native';

export default function PaymentsUICompleteScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const { error } = await presentPaymentSheet();

    if (!error) {
      Alert.alert('Success', 'The payment was confirmed successfully');
    } else if (error.code === PaymentSheetError.Failed) {
      Alert.alert(
        `PaymentSheet present failed with error code: ${error.code}`,
        error.message
      );
    } else if (error.code === PaymentSheetError.Canceled) {
      Alert.alert(
        `PaymentSheet present was canceled with code: ${error.code}`,
        error.message
      );
    }
    setPaymentSheetEnabled(false);
    setLoading(false);
  };

  const initialisePaymentSheet = async () => {
    const { paymentIntent, ephemeralKey, customer } =
      await fetchPaymentSheetParams();

    const address: Address = {
      city: 'San Francisco',
      country: 'AT',
      line1: '510 Townsend St.',
      line2: '123 Street',
      postalCode: '94102',
      state: 'California',
    };
    const billingDetails: BillingDetails = {
      name: 'Jane Doe',
      email: 'foo@bar.com',
      phone: '555-555-555',
      address: address,
    };

    const { error } = await initPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      customFlow: false,
      merchantDisplayName: 'Example Inc.',
      applePay: true,
      merchantCountryCode: 'US',
      style: 'automatic',
      googlePay: true,
      testEnv: true,
      returnURL: 'stripe-example://stripe-redirect',
      defaultBillingDetails: billingDetails,
      allowsDelayedPaymentMethods: true,
      appearance: {
        font: {
          scale: 2,
          name:
            Platform.OS === 'android' ? 'macondoregular' : 'Macondo-Regular',
        },
        colors: {
          light: {
            primary: '#ff0000',
            background: '#00ff00',
            componentBackground: '#8000ff',
            componentBorder: '#d6de00',
            componentDivider: '#62ff08',
            text: '#ff7b00',
            textSecondary: '#5181fc',
            componentText: '#f7a900',
            componentPlaceholderText: '#f7a900',
            icon: '#f700b9',
            danger: '#f700b9',
          },
          dark: {
            primary: '#00ff00',
            background: '#ff0000',
            componentBackground: '#ff0080',
            componentBorder: '#62ff08',
            componentDivider: '#d6de00',
            text: '#5181fc',
            textSecondary: '#ff7b00',
            componentText: '#00ffff',
            componentPlaceholderText: '#00ffff',
            icon: '#f0f0f0',
            danger: '#0f0f0f',
          },
        },
        shapes: {
          borderRadius: 10,
          borderWidth: 5,
          shadow: {
            opacity: 1,
            color: '#000000',
            offset: { x: -10, y: 5 },
            borderRadius: 1,
          },
        },
        primaryButton: {
          // font: {
          //   name: 'some-missing-font',
          // },
          colors: {
            background: '#000000',
            text: '#ffffff',
            componentBorder: '#ff00ff',
          },
          shapes: {
            borderRadius: 10,
            borderWidth: 2,
            shadow: {
              opacity: 1,
              color: '#000000',
              offset: { x: 10, y: -5 },
              borderRadius: 1,
            },
          },
        },
      },
    });
    if (!error) {
      setPaymentSheetEnabled(true);
    } else if (error.code === PaymentSheetError.Failed) {
      Alert.alert(
        `PaymentSheet init failed with error code: ${error.code}`,
        error.message
      );
    } else if (error.code === PaymentSheetError.Canceled) {
      Alert.alert(
        `PaymentSheet init was canceled with code: ${error.code}`,
        error.message
      );
    }
  };

  return (
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    <PaymentScreen onInit={initialisePaymentSheet}>
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </PaymentScreen>
  );
}
