import React, { useState, useCallback, useEffect } from 'react';
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
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';
import { getClientSecretParams } from '../helpers';

export default function PaymentSheetDeferredIntentScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customerKeyType, setCustomerKeyType] = useState<string>(
    'legacy_ephemeral_key'
  );

  const fetchPaymentSheetParams = async (customer_key_type: string) => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_key_type,
      }),
    });

    if (customer_key_type === 'customer_session') {
      const { customerSessionClientSecret, customer } = await response.json();
      return {
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { ephemeralKey, customer } = await response.json();
      return {
        ephemeralKey,
        customer,
      };
    }
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

  const initialisePaymentSheet = useCallback(
    async (shippingDetails?: AddressDetails) => {
      const { customer, ...remainingParams } =
        await fetchPaymentSheetParams(customerKeyType);

      const clientSecretParams = getClientSecretParams(
        customerKeyType,
        remainingParams
      );

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
        customFlow: false,
        ...clientSecretParams,
        merchantDisplayName: 'Example Inc.',
        applePay: { merchantCountryCode: 'US' },
        style: 'automatic',
        returnURL: 'stripe-example://stripe-redirect',
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        allowsDelayedPaymentMethods: true,
        primaryButtonLabel: 'purchase!',
        cardBrandAcceptance: {
          filter: PaymentSheet.CardBrandAcceptanceFilter.Disallowed,
          brands: [PaymentSheet.CardBrandCategory.Amex],
        },
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
            const { clientSecret, error: responseError } =
              await response.json();

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
    },
    [customerKeyType, initPaymentSheet]
  );

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
        title={paymentSheetEnabled && !loading ? 'Checkout' : 'Loading...'}
        onPress={openPaymentSheet}
      />
    </PaymentScreen>
  );
}
