import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  PlatformPay,
  AddToWalletButton,
  Constants,
  canAddCardToWallet,
  PlatformPayButton,
  usePlatformPay,
  updatePlatformPaySheet,
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
    createPlatformPayPaymentMethod,
    createPlatformPayToken,
    isPlatformPaySupported,
    confirmPlatformPayPayment,
  } = usePlatformPay();

  useEffect(() => {
    fetchEphemeralKey();
    checkIfCardInWallet();
    fetchPaymentIntentClientSecret();
  }, []);

  const couponCodeListener = (event: { couponCode: string }) => {
    console.log(JSON.stringify(event.couponCode, null, 2));
    if (event.couponCode === 'stripe') {
      const newCart: PlatformPay.CartSummaryItem[] = [
        {
          label: 'Subtotal',
          amount: '12.75',
          paymentType: PlatformPay.PaymentType.Immediate,
        },
        {
          label: 'Discount',
          amount: '2.75',
          paymentType: PlatformPay.PaymentType.Immediate,
        },
        {
          label: 'Shipping',
          amount: '0.00',
          isPending: false,
          paymentType: PlatformPay.PaymentType.Immediate,
        },
        {
          label: 'Total',
          amount: '10.75',
          isPending: false,
          paymentType: PlatformPay.PaymentType.Immediate,
        },
      ];
      setCart(newCart);
      updatePlatformPaySheet({
        applePay: {
          cartItems: newCart,
          shippingMethods: [
            {
              identifier: 'free-express',
              detail: 'Ships within 24 hours',
              label: 'FREE Express Shipping',
              amount: '0.00',
            },
          ],
          errors: [],
        },
      });
    } else {
      updatePlatformPaySheet({
        applePay: {
          cartItems: cart,
          shippingMethods,
          errors: [
            {
              errorType: PlatformPay.ApplePaySheetErrorType.InvalidCouponCode,
              message: 'Invalid coupon code. Test coupon code is: "stripe"',
            },
          ],
        },
      });
    }
  };

  useEffect(() => {
    (async function () {
      setIsApplePaySupported(await isPlatformPaySupported());
    })();
  }, [isPlatformPaySupported]);

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
      console.log(error.code, error.message);
    } else {
      setShowAddToWalletButton(canAddCard ?? false);
      if (details?.status) {
        console.log(`Card status for native wallet: ${details.status}`);
      }
    }
  };

  const shippingMethods: PlatformPay.ShippingMethod[] = [
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
      startDate: 1670554064,
      endDate: 1670726864,
    },
    {
      identifier: 'express',
      detail: 'Ships within 24 hours',
      label: 'Express Shipping',
      amount: '24.63',
    },
  ];
  const [cart, setCart] = useState<PlatformPay.CartSummaryItem[]>([
    {
      label: 'Subtotal',
      amount: '12.75',
      paymentType: PlatformPay.PaymentType.Recurring,
      startDate: 1670554064,
      endDate: 1670726864,
      intervalUnit: PlatformPay.IntervalUnit.Day,
      intervalCount: 3,
    },
    {
      label: 'Shipping',
      amount: '0.00',
      isPending: false,
      paymentType: PlatformPay.PaymentType.Immediate,
    },
    {
      label: 'Total',
      amount: '12.75',
      isPending: false,
      paymentType: PlatformPay.PaymentType.Immediate,
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
    const { paymentIntent, error } = await confirmPlatformPayPayment(
      clientSecret as string,
      {
        applePay: {
          cartItems: cart,
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          shippingMethods,
          requiredShippingAddressFields: [
            PlatformPay.ContactField.EmailAddress,
            PlatformPay.ContactField.PhoneNumber,
            PlatformPay.ContactField.PostalAddress,
            PlatformPay.ContactField.Name,
          ],
          requiredBillingContactFields: [
            PlatformPay.ContactField.PostalAddress,
          ],
          shippingType: PlatformPay.ApplePayShippingType.StorePickup,
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
    const { paymentMethod, shippingContact, error } =
      await createPlatformPayPaymentMethod({
        applePay: {
          cartItems: cart,
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          shippingMethods,
          requiredShippingAddressFields: [
            PlatformPay.ContactField.EmailAddress,
            PlatformPay.ContactField.PhoneNumber,
            PlatformPay.ContactField.PostalAddress,
            PlatformPay.ContactField.Name,
          ],
          requiredBillingContactFields: [
            PlatformPay.ContactField.PostalAddress,
          ],
          supportsCouponCode: true,
          couponCode: '123',
          shippingType: PlatformPay.ApplePayShippingType.StorePickup,
          additionalEnabledNetworks: ['JCB'],
        },
      });
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for payment method details.');
      console.log(JSON.stringify(paymentMethod, null, 2));
      console.log(JSON.stringify(shippingContact, null, 2));
    }
  };

  const createToken = async () => {
    const { token, shippingContact, error } = await createPlatformPayToken({
      applePay: {
        cartItems: cart,
        merchantCountryCode: 'US',
        currencyCode: 'USD',
        shippingMethods,
        requiredShippingAddressFields: [
          PlatformPay.ContactField.EmailAddress,
          PlatformPay.ContactField.PhoneNumber,
          PlatformPay.ContactField.PostalAddress,
          PlatformPay.ContactField.Name,
        ],
        requiredBillingContactFields: [PlatformPay.ContactField.PostalAddress],
        supportsCouponCode: true,
        couponCode: '123',
        shippingType: PlatformPay.ApplePayShippingType.StorePickup,
        additionalEnabledNetworks: ['JCB'],
      },
    });
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for token details.');
      console.log(JSON.stringify(token, null, 2));
      console.log(JSON.stringify(shippingContact, null, 2));
    }
  };

  return (
    <PaymentScreen>
      <View>
        <Text>{JSON.stringify(cart, null, 2)}</Text>
      </View>

      <View>
        <PlatformPayButton
          onPress={pay}
          appearance={PlatformPay.ButtonStyle.White}
          borderRadius={4}
          disabled={!isApplePaySupported}
          style={styles.payButton}
          onShippingContactSelected={({ shippingContact }) => {
            console.log(JSON.stringify(shippingContact, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
          onShippingMethodSelected={({ shippingMethod }) => {
            console.log(JSON.stringify(shippingMethod, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
        />

        <PlatformPayButton
          onPress={createPaymentMethod}
          type={PlatformPay.ButtonType.Continue}
          appearance={PlatformPay.ButtonStyle.WhiteOutline}
          borderRadius={4}
          disabled={!isApplePaySupported}
          style={styles.createPaymentMethodButton}
          onCouponCodeEntered={couponCodeListener}
          onShippingContactSelected={({ shippingContact }) => {
            console.log(JSON.stringify(shippingContact, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
          onShippingMethodSelected={({ shippingMethod }) => {
            console.log(JSON.stringify(shippingMethod, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
        />

        <PlatformPayButton
          onPress={createToken}
          type={PlatformPay.ButtonType.SetUp}
          appearance={PlatformPay.ButtonStyle.Black}
          borderRadius={4}
          disabled={!isApplePaySupported}
          style={styles.createPaymentMethodButton}
          onCouponCodeEntered={couponCodeListener}
          onShippingContactSelected={({ shippingContact }) => {
            console.log(JSON.stringify(shippingContact, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
          onShippingMethodSelected={({ shippingMethod }) => {
            console.log(JSON.stringify(shippingMethod, null, 2));
            updatePlatformPaySheet({
              applePay: { cartItems: cart, shippingMethods, errors: [] },
            });
          }}
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
    marginTop: 20,
    alignSelf: 'center',
  },
  createPaymentMethodButton: {
    width: '65%',
    height: 50,
    marginTop: 20,
    alignSelf: 'center',
  },
});
