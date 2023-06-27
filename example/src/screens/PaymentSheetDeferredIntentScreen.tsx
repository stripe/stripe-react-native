import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
  AddressDetails,
  useStripe,
  BillingDetails,
  Address,
  PaymentSheetError,
  PaymentSheet,
  PaymentMethod,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function PaymentSheetDeferredIntentScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { ephemeralKey, customer } = await response.json();
    return {
      ephemeralKey,
      customer,
    };
  };

  const openPaymentSheet = async () => {
    setLoading(true);
    const { error } = await presentPaymentSheet();

    if (!error) {
      Alert.alert('Success', 'The payment was confirmed successfully');
    } else {
      switch (error.code) {
        case PaymentSheetError.Failed:
          Alert.alert(
            `PaymentSheet present failed with error code: ${error.code}`,
            error.message
          );
          setPaymentSheetEnabled(false);
          break;
        case PaymentSheetError.Canceled:
          Alert.alert(
            `PaymentSheet present was canceled with code: ${error.code}`,
            error.message
          );
          break;
        case PaymentSheetError.Timeout:
          Alert.alert(
            `PaymentSheet present timed out: ${error.code}`,
            error.message
          );
          break;
      }
    }
    setLoading(false);
  };

  const initialisePaymentSheet = async (shippingDetails?: AddressDetails) => {
    const { ephemeralKey, customer } = await fetchPaymentSheetParams();

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
      customFlow: false,
      merchantDisplayName: 'Example Inc.',
      applePay: { merchantCountryCode: 'US' },
      style: 'automatic',
      returnURL: 'stripe-example://stripe-redirect',
      defaultBillingDetails: billingDetails,
      defaultShippingDetails: shippingDetails,
      allowsDelayedPaymentMethods: true,
      primaryButtonLabel: 'purchase!',
      intentConfiguration: {
        confirmHandler: async (
          paymentMethod: PaymentMethod.Result,
          _shouldSavePaymentMethod: boolean,
          intentCreationCallback: (
            result: PaymentSheet.IntentCreationCallbackParams
          ) => void
        ) => {
          const response = await fetch(
            `${API_URL}/payment-intent-for-payment-sheet`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentMethodId: paymentMethod.id,
                customerId: customer,
              }),
            }
          );
          const { clientSecret, error: responseError } = await response.json();

          if (responseError) {
            intentCreationCallback({
              error: {
                code: 'Failed',
                message: responseError.raw.message,
                localizedMessage: responseError.raw.message,
              },
            });
          } else {
            intentCreationCallback({ clientSecret });
          }
        },
        mode: {
          amount: 6099,
          currencyCode: 'USD',
        },
        paymentMethodTypes: ['card'],
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
        title={paymentSheetEnabled && !loading ? 'Checkout' : 'Loading...'}
        onPress={openPaymentSheet}
      />
    </PaymentScreen>
  );
}
