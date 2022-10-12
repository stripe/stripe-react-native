import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
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
      applePay: { merchantCountryCode: 'US' },
      style: 'automatic',
      googlePay: {
        merchantCountryCode: 'US',
        testEnv: true,
      },
      returnURL: 'stripe-example://stripe-redirect',
      defaultBillingDetails: billingDetails,
      allowsDelayedPaymentMethods: true,
      appearance,
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
        title="Checkout"
        onPress={openPaymentSheet}
      />
      <AddressSheet
        visible={addressSheetVisible}
        onSubmit={(result) => {
          setAddressSheetVisible(false);
          console.log(JSON.stringify(result, null, 2));
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
          name: 'Tom Riddle',
          phone: '777-777-7777',
          isCheckboxSelected: true,
          address: {
            country: 'Britain',
            line1: 'Hogwarts',
            postalCode: '77777',
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
    </PaymentScreen>
  );
}
