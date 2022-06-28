import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  ApplePayButton,
  useApplePay,
  ApplePay,
  AddToWalletButton,
  Constants,
  canAddCardToWallet,
} from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { useEffect } from 'react';

const TEST_CARD_ID = 'ic_1KnngYF05jLespP6nGoB1oXn';

export default function ApplePayScreen() {
  const [ephemeralKey, setEphemeralKey] = useState({});
  const [showAddToWalletButton, setShowAddToWalletButton] = useState(true);
  const [cardDetails, setCardDetails] = useState<any>(null);

  useEffect(() => {
    fetchEphemeralKey();
    checkIfCardInWallet();
  }, []);

  const checkIfCardInWallet = async () => {
    const response = await fetch(`${API_URL}/issuing-card-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: TEST_CARD_ID,
      }),
    });

    const card = await response.json();
    setCardDetails(card);

    const { canAddCard, details, error } = await canAddCardToWallet({
      primaryAccountIdentifier: card?.wallet?.primary_account_identifier,
      cardLastFour: card.last4,
      testEnv: true,
    });

    if (error) {
      Alert.alert(error.code, error.message);
    } else {
      setShowAddToWalletButton(canAddCard ?? false);
      if (details?.status) {
        console.log(`Card status for native wallet: ${details.status}`);
      }
    }
  };

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
    { label: 'Subtotal', amount: '12.75', type: 'Immediate' },
    { label: 'Shipping', amount: '0.00', isPending: true, type: 'Immediate' },
    { label: 'Total', amount: '12.75', isPending: true, type: 'Immediate' }, // Last item in array needs to reflect the total.
  ]);

  const { presentApplePay, confirmApplePayPayment, isApplePaySupported } =
    useApplePay({
      onShippingMethodSelected: (shippingMethod, handler) => {
        console.log('shippingMethod', shippingMethod);
        // Update cart summary based on selected shipping method.
        const updatedCart: ApplePay.CartSummaryItem[] = [
          cart[0],
          {
            label: shippingMethod.label,
            amount: shippingMethod.amount,
            type: 'Immediate',
          },
          {
            label: 'Total',
            amount: (
              parseFloat(cart[0].amount) + parseFloat(shippingMethod.amount)
            ).toFixed(2),
            type: 'Immediate',
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

  const fetchEphemeralKey = async () => {
    const response = await fetch(`${API_URL}/ephemeral-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiVersion: Constants.API_VERSIONS.ISSUING,
        issuingCardId: TEST_CARD_ID,
      }),
    });
    const key = await response.json();
    setEphemeralKey(key);
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
      jcbEnabled: true,
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
        <View>
          <ApplePayButton
            onPress={pay}
            type="plain"
            buttonStyle="black"
            borderRadius={4}
            style={styles.payButton}
          />

          {showAddToWalletButton && (
            <AddToWalletButton
              androidAssetSource={{}}
              testEnv={true}
              style={styles.payButton}
              iOSButtonStyle="onLightBackground"
              cardDetails={{
                name: cardDetails?.cardholder?.name,
                primaryAccountIdentifier:
                  cardDetails?.wallets?.primary_account_identifier,
                lastFour: cardDetails?.last4,
                description: 'Added by Stripe',
              }}
              ephemeralKey={ephemeralKey}
              onComplete={({ error }) => {
                Alert.alert(
                  error ? error.code : 'Success',
                  error
                    ? error.message
                    : 'Card was successfully added to the wallet.'
                );
              }}
            />
          )}
        </View>
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  payButton: {
    width: '65%',
    height: 50,
    marginTop: 60,
    alignSelf: 'center',
  },
});
