import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  ApplePayButton,
  useApplePay,
  ApplePay,
} from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function ApplePayScreen() {
  const shippingMethods: ApplePay.ShippingMethod[] = [
    {
      identifier: 'free',
      detail: 'Arrives by July 2',
      label: 'Free Shipping',
      amount: '0.0',
    },
    {
      identifier: 'standard',
      detail: 'Arrives by June 29',
      label: 'Standard Shipping',
      amount: '3.21',
    },
    {
      identifier: 'express',
      detail: 'Ships within 24 hours',
      label: 'Express Shipping',
      amount: '24.63',
    },
  ];
  const [cart, setCart] = useState<ApplePay.CartSummaryItem[]>([
    { label: 'Subtotal', amount: '12.75', type: 'final' },
    { label: 'Shipping', amount: '0.00', type: 'pending' },
    { label: 'Total', amount: '12.75', type: 'pending' }, // Last item in array needs to reflect the total.
  ]);

  const {
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  } = useApplePay({
    onShippingMethodSelected: (shippingMethod, handler) => {
      console.log('shippingMethod', shippingMethod);
      // Update cart summary based on selected shipping method.
      const updatedCart = [
        cart[0],
        { label: shippingMethod.label, amount: shippingMethod.amount },
        {
          label: 'Total',
          amount: (
            parseFloat(cart[0].amount) + parseFloat(shippingMethod.amount)
          ).toFixed(2),
        },
      ];
      setCart(updatedCart);
      handler(updatedCart);
    },
    onShippingContactSelected: (shippingContact, handler) => {
      console.log('shippingContact', shippingContact);
      // Make modifications to cart here e.g. adding tax.
      handler(cart);
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
        items: cart,
        force3dSecure: true,
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const pay = async () => {
    const { error, paymentMethod } = await presentApplePay({
      cartItems: cart,
      country: 'US',
      currency: 'USD',
      shippingMethods,
      requiredShippingAddressFields: [
        'emailAddress',
        'phoneNumber',
        'postalAddress',
        'name',
      ],
      requiredBillingContactFields: ['phoneNumber', 'name'],
    });

    if (error) {
      Alert.alert(error.code, error.message);
    } else {
      console.log(JSON.stringify(paymentMethod, null, 2));
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
    <PaymentScreen>
      <View>
        <Text>{JSON.stringify(cart, null, 2)}</Text>
      </View>
      {isApplePaySupported && (
        <ApplePayButton
          onPress={pay}
          type="plain"
          buttonStyle="black"
          borderRadius={4}
          style={styles.payButton}
        />
      )}
    </PaymentScreen>
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
