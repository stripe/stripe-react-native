import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  ApplePay,
  NativePay,
  AddToWalletButton,
  Constants,
  canAddCardToWallet,
  addOnApplePayShippingContactSelectedListener,
  addOnApplePayShippingMethodSelectedListener,
  NativePayButton,
  useNativePay,
} from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { useEffect } from 'react';

const TEST_CARD_ID = 'ic_1KnngYF05jLespP6nGoB1oXn';

export default function ApplePayScreen() {
  const [ephemeralKey, setEphemeralKey] = useState({});
  const [showAddToWalletButton, setShowAddToWalletButton] = useState(true);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [isApplePaySupported, setIsApplePaySupported] = useState(false);
  const [clientSecret, setClientSecret] = useState<String | null>(null);
  const {
    createNativePayPaymentMethod,
    isNativePaySupported,
    confirmNativePayPayment,
  } = useNativePay({
    onApplePayCouponCodeEntered: (code, handler) => {
      console.log(JSON.stringify(code, null, 2));
      if (code === 'stripe') {
        setCart([
          { label: 'Subtotal', amount: '12.75', paymentType: 'Immediate' },
          { label: 'Discount', amount: '2.75', paymentType: 'Immediate' },
          {
            label: 'Shipping',
            amount: '0.00',
            isPending: false,
            paymentType: 'Immediate',
          },
          {
            label: 'Total',
            amount: '10.75',
            isPending: false,
            paymentType: 'Immediate',
          },
        ]);
        handler(
          cart,
          [
            {
              identifier: 'free-express',
              detail: 'Ships within 24 hours',
              label: 'FREE Express Shipping',
              amount: '0.00',
            },
          ],
          []
        );
      } else {
        handler(cart, shippingMethods, [
          {
            errorType: ApplePay.ApplePaySheetErrorType.InvalidCouponCode,
            message: 'Invalid coupon code. Test coupon code is: "stripe"',
          },
        ]);
      }
    },
  });

  useEffect(() => {
    fetchEphemeralKey();
    checkIfCardInWallet();
    fetchPaymentIntentClientSecret();
  }, []);

  useEffect(() => {
    const shippingContactListener =
      addOnApplePayShippingContactSelectedListener((event) => {
        console.log(JSON.stringify(event, null, 2));
      });
    const shippingMethodListener = addOnApplePayShippingMethodSelectedListener(
      (event) => {
        console.log(JSON.stringify(event, null, 2));
      }
    );

    return function cleanup() {
      shippingContactListener.remove();
      shippingMethodListener.remove();
    };
  });

  useEffect(() => {
    const checkCapability = async () => {
      setIsApplePaySupported(await isNativePaySupported());
    };
    checkCapability();
  }, [isNativePaySupported]);

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
    { label: 'Subtotal', amount: '12.75', paymentType: 'Immediate' },
    {
      label: 'Shipping',
      amount: '0.00',
      isPending: false,
      paymentType: 'Immediate',
    },
    {
      label: 'Total',
      amount: '12.75',
      isPending: false,
      paymentType: 'Immediate',
    }, // Last item in array needs to reflect the total.
  ]);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: ['id-4', 'id-5'],
        force3dSecure: true,
      }),
    });
    const result = await response.json();
    if (!result.clientSecret) {
      Alert.alert('Error fetching client secret.', result.error);
    }
    setClientSecret(result.clientSecret);
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
    if (!clientSecret) {
      Alert.alert('No client secret is set.');
      return;
    }
    const { paymentIntent, error } = await confirmNativePayPayment(
      clientSecret as string,
      {
        applePay: {
          cartItems: cart,
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          shippingMethods,
          requiredShippingAddressFields: [
            'emailAddress',
            'phoneNumber',
            'postalAddress',
            'name',
          ],
          requiredBillingContactFields: ['postalAddress'],
          shippingType: NativePay.ApplePayShippingType.StorePickup,
          additionalEnabledNetworks: ['JCB'],
        },
      }
    );
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for payment intent details.');
      console.log(JSON.stringify(paymentIntent, null, 2));
      setClientSecret(null);
    }
  };

  const createPaymentMethod = async () => {
    const { paymentMethod, token, error } = await createNativePayPaymentMethod({
      applePay: {
        cartItems: cart,
        merchantCountryCode: 'US',
        currencyCode: 'USD',
        shippingMethods,
        requiredShippingAddressFields: [
          'emailAddress',
          'phoneNumber',
          'postalAddress',
          'name',
        ],
        requiredBillingContactFields: ['postalAddress'],
        supportsCouponCode: true,
        couponCode: '123',
        shippingType: NativePay.ApplePayShippingType.StorePickup,
        additionalEnabledNetworks: ['JCB'],
      },
    });
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    } else {
      Alert.alert(
        'Success',
        'Check the logs for payment method and token details.'
      );
      console.log(JSON.stringify(paymentMethod, null, 2));
      console.log(JSON.stringify(token, null, 2));
    }
  };

  return (
    <PaymentScreen>
      <View>
        <Text>{JSON.stringify(cart, null, 2)}</Text>
      </View>

      <View>
        <NativePayButton
          onPress={pay}
          type={NativePay.ButtonType.Plain}
          appearance={NativePay.ButtonStyle.White}
          borderRadius={4}
          disabled={!isApplePaySupported}
          style={styles.payButton}
        />

        <NativePayButton
          onPress={createPaymentMethod}
          type={NativePay.ButtonType.Continue}
          appearance={NativePay.ButtonStyle.WhiteOutline}
          borderRadius={4}
          disabled={!isApplePaySupported}
          style={styles.createPaymentMethodButton}
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
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  payButton: {
    width: '65%',
    height: 50,
    marginTop: 40,
    alignSelf: 'center',
  },
  createPaymentMethodButton: {
    width: '65%',
    height: 50,
    marginTop: 40,
    alignSelf: 'center',
  },
});
