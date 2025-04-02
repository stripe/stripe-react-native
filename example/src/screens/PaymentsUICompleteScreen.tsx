import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  AddressDetails,
  useStripe,
  BillingDetails,
  Address,
  PaymentSheetError,
  AddressSheet,
  AddressSheetError,
  CardBrand,
  PaymentMethodLayout,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import appearance from './PaymentSheetAppearance';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';
import { getClientSecretParams } from '../helpers';

export default function PaymentsUICompleteScreen() {
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } =
    useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();

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
      const { paymentIntent, customerSessionClientSecret, customer } =
        await response.json();
      setClientSecret(paymentIntent);
      return {
        paymentIntent,
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { paymentIntent, ephemeralKey, customer } = await response.json();
      setClientSecret(paymentIntent);
      return {
        paymentIntent,
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
      const { paymentIntent, customer, ...remainingParams } =
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
        paymentIntentClientSecret: paymentIntent,
        customFlow: false,
        merchantDisplayName: 'Example Inc.',
        applePay: { merchantCountryCode: 'US' },
        style: 'automatic',
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: true,
        },
        returnURL: 'stripe-example://stripe-redirect',
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        allowsDelayedPaymentMethods: true,
        appearance,
        primaryButtonLabel: 'purchase!',
        paymentMethodLayout: PaymentMethodLayout.Automatic,
        removeSavedPaymentMethodMessage: 'remove this payment method?',
        preferredNetworks: [CardBrand.Amex, CardBrand.Visa],
        updatePaymentMethodEnabled: true,
        ...clientSecretParams,
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
    <PaymentScreen>
      <Button
        variant="default"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title="Add shipping"
        onPress={() => {
          setTimeout(function () {
            setAddressSheetVisible(false);
          }, 5000);
          setAddressSheetVisible(true);
        }}
      />
      <CustomerSessionSwitch
        onValueChange={toggleCustomerKeyType}
        value={customerKeyType === 'customer_session'}
      />
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title={
          paymentSheetEnabled && !loading
            ? 'Checkout'
            : 'Fetching payment intent...'
        }
        onPress={openPaymentSheet}
      />
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title={
          paymentSheetEnabled && !loading
            ? 'trigger payment sheet timeout'
            : 'Fetching payment intent...'
        }
        onPress={async () => {
          if (!clientSecret) {
            return;
          }
          setLoading(true);
          const { error } = await presentPaymentSheet({ timeout: 5000 });
          if (error) {
            Alert.alert(`${error.code}`, error.message);
          }
          setLoading(false);
        }}
      />
      <AddressSheet
        visible={addressSheetVisible}
        onSubmit={async (result) => {
          setPaymentSheetEnabled(false);
          setAddressSheetVisible(false);
          console.log(JSON.stringify(result, null, 2));
          await initialisePaymentSheet(result);
        }}
        onError={(err) => {
          if (err.code === AddressSheetError.Failed) {
            Alert.alert('There was an error.', 'Check the logs for details.');
            console.log(err?.localizedMessage);
          }
          setAddressSheetVisible(false);
        }}
        presentationStyle={'popover'}
        animationStyle={'flip'}
        appearance={{}}
        defaultValues={{
          name: 'Michael Scott',
          phone: '111-222-3333',
          isCheckboxSelected: true,
          address: {
            country: 'United States',
            line1: 'Dunder Mifflin',
            postalCode: '12345',
            city: 'Scranton',
          },
        }}
        additionalFields={{
          phoneNumber: 'required',
          checkboxLabel: 'Send me lots of emails',
        }}
        // allowedCountries={['US', 'CA']}
        // autocompleteCountries={['CA']}
        primaryButtonTitle={'use this address'}
        sheetTitle={'🧙‍♀️ custom title'}
        googlePlacesApiKey={'this-api-key-wont-work'}
      />
      <Button
        title="Reset customer"
        onPress={async () => {
          // Link will still be presented for the customer if you pass in the customer ID and ephemeral key to payment sheet
          await resetPaymentSheetCustomer();
        }}
      />
    </PaymentScreen>
  );
}
