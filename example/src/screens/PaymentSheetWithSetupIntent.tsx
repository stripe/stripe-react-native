import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useStripe, PaymentSheetError } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { getClientSecretParams } from '../helpers';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';

export default function PaymentSheetWithSetupIntent() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();

  const [customerKeyType, setCustomerKeyType] = useState<string>(
    'legacy_ephemeral_key'
  );

  const fetchPaymentSheetParams = async (customer_key_type: string) => {
    const response = await fetch(`${API_URL}/payment-sheet-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_key_type,
      }),
    });

    if (customer_key_type === 'customer_session') {
      const { setupIntent, customerSessionClientSecret, customer } =
        await response.json();
      setClientSecret(setupIntent);
      return {
        setupIntent,
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { setupIntent, ephemeralKey, customer } = await response.json();
      setClientSecret(setupIntent);
      return {
        setupIntent,
        ephemeralKey,
        customer,
      };
    }
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

  const initialisePaymentSheet = useCallback(async () => {
    const { setupIntent, customer, ...remainingParams } =
      await fetchPaymentSheetParams(customerKeyType);

    const clientSecretParams = getClientSecretParams(
      customerKeyType,
      remainingParams
    );

    console.log(clientSecretParams);

    const startDate = Math.floor(Date.now() / 1000);
    const endDate = Math.floor((Date.now() + 60 * 60 * 24 * 365 * 1000) / 1000);
    const { error } = await initPaymentSheet({
      customerId: customer,
      ...clientSecretParams,
      setupIntentClientSecret: setupIntent,
      merchantDisplayName: 'Example Inc.',
      applePay: {
        merchantCountryCode: 'US',
        cartItems: [
          {
            paymentType: 'Recurring',
            label: 'This is a subscription',
            amount: '10.00',
            intervalCount: 1,
            intervalUnit: 'month',
            startDate: startDate,
            endDate: endDate,
          },
        ],
      },
      style: 'automatic',
      googlePay: {
        merchantCountryCode: 'US',
        testEnv: true,
      },
      returnURL: 'stripe-example://stripe-redirect',
      allowsDelayedPaymentMethods: true,
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
  }, [customerKeyType, initPaymentSheet]);

  const toggleCustomerKeyType = (value: boolean) => {
    if (value) {
      setCustomerKeyType('customer_session');
    } else {
      setCustomerKeyType('legacy_ephemeral_key');
    }
  };

  useEffect(() => {
    setPaymentSheetEnabled(false);
    initialisePaymentSheet().catch((err) => console.log(err));
  }, [customerKeyType, initialisePaymentSheet]);

  return (
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    <PaymentScreen onInit={initialisePaymentSheet}>
      <CustomerSessionSwitch
        value={customerKeyType === 'customer_session'}
        onValueChange={toggleCustomerKeyType}
      />
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title="Setup a subscription"
        onPress={openPaymentSheet}
      />
    </PaymentScreen>
  );
}
