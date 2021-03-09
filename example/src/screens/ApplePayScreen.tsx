import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { ApplePayButton, useApplePay, useStripe } from 'stripe-react-native';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function ApplePayScreen() {
  const { updateApplePaySummaryItems } = useStripe();
  const {
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  } = useApplePay({
    onDidSetShippingMethodCallback: (shippingMethod) => {
      console.log('shippingMethod', shippingMethod);
      updateApplePaySummaryItems([
        { label: 'Example item name 1', amount: '11.00' },
        { label: 'Example item name 2', amount: '25.00' },
      ]);
    },
    onDidSetShippingContactCallback: (shippingContact) => {
      console.log('shippingContact', shippingContact);
      updateApplePaySummaryItems([
        { label: 'Example item name 1', amount: '92.00' },
        { label: 'Example item name 2', amount: '142.00' },
      ]);
    },
  });

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
    const { error } = await presentApplePay({
      cartItems: [{ label: 'Example item name', amount: '14.00' }],
      country: 'US',
      currency: 'USD',
      shippingMethods: [
        {
          amount: '20.00',
          identifier: 'DPS',
          label: 'Courier',
          detail: 'Delivery',
          type: 'final',
        },
        {
          amount: '20.00',
          identifier: 'DPS2',
          label: 'Courier2',
          detail: 'Delivery',
          type: 'final',
        },
      ],
      requiredShippingAddressFields: ['emailAddress', 'phoneNumber'],
      requiredBillingContactFields: ['phoneNumber', 'name'],
    });

    if (error) {
      Alert.alert(error.code, error.message);
    } else {
      const clientSecret = await fetchPaymentIntentClientSecret();

      const { error: confirmApplePayError } = await confirmApplePayPayment(
        clientSecret
      );

      if (confirmApplePayError) {
        Alert.alert(confirmApplePayError.code, confirmApplePayError.message);
      } else {
        Alert.alert('Success', 'The payment was confirmed successfully!');
      }
    }
  };

  return (
    <Screen>
      {isApplePaySupported && (
        <ApplePayButton
          onPress={pay}
          type="plain"
          buttonStyle="black"
          style={styles.payButton}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  payButton: {
    width: '50%',
    height: 50,
    marginTop: 60,
    alignSelf: 'center',
  },
});
