import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
  AddressDetails,
  useStripe,
  BillingDetails,
  Address,
  PaymentSheetError,
  AddressSheet,
  AddressSheetError,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import appearance from './PaymentSheetAppearance';

export default function PaymentsUICompleteScreen() {
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } =
    useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
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

  const initialisePaymentSheet = async (shippingDetails?: AddressDetails) => {
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
        variant="default"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title="Add shipping"
        onPress={() => setAddressSheetVisible(true)}
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
