import React, { useEffect, useState } from 'react';
import {
  GooglePayButton,
  useGooglePay,
  AddToWalletButton,
  Constants,
  canAddCardToWallet,
  GooglePayCardToken,
} from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { Alert, StyleSheet, View, Image } from 'react-native';
// @ts-ignore
import AddToGooglePayPNG from '../assets/Add-to-Google-Pay-Button-dark-no-shadow.png';

const LIVE_CARD_ID = 'ic_1KnTM2F05jLespP6wNLZQ1mu';

export default function GooglePayScreen() {
  const {
    isGooglePaySupported,
    initGooglePay,
    presentGooglePay,
    loading,
    createGooglePayPaymentMethod,
  } = useGooglePay();
  const [initialized, setInitialized] = useState(false);
  const [ephemeralKey, setEphemeralKey] = useState({});
  const [showAddToWalletButton, setShowAddToWalletButton] = useState(true);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [androidCardToken, setAndroidCardToken] =
    useState<null | GooglePayCardToken>(null);

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
        id: LIVE_CARD_ID,
      }),
    });

    const card = await response.json();

    setCardDetails(card);

    const { canAddCard, details, error } = await canAddCardToWallet({
      primaryAccountIdentifier: card?.wallet?.primary_account_identifier,
      cardLastFour: card.last4,
    });

    if (error) {
      Alert.alert(error.code, error.message);
    } else {
      setShowAddToWalletButton(canAddCard ?? false);
      if (details?.status) {
        console.log(`Card status for native wallet: ${details.status}`);
      }
      if (
        details?.token?.status === 'TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION'
      ) {
        setAndroidCardToken(details.token);
      }
    }
  };

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
    // 2. Fetch payment intent client secret
    const clientSecret = await fetchPaymentIntentClientSecret();

    // 3. Open Google Pay sheet and proceed a payment
    const { error } = await presentGooglePay({
      clientSecret,
      forSetupIntent: false,
    });

    if (error) {
      Alert.alert(error.code, error.message);
      return;
    }
    Alert.alert('Success', 'The payment was confirmed successfully.');
    setInitialized(false);
  };

  /*
    As an alternative you can only create a paymentMethod instead of confirming the payment.
  */
  const createPaymentMethod = async () => {
    const { error, paymentMethod } = await createGooglePayPaymentMethod({
      amount: 12,
      currencyCode: 'USD',
    });

    if (error) {
      Alert.alert(error.code, error.message);
      return;
    } else if (paymentMethod) {
      Alert.alert(
        'Success',
        `The payment method was created successfully. paymentMethodId: ${paymentMethod.id}`
      );
    }
    setInitialized(false);
  };

  // 1. Initialize Google Pay
  const initialize = async () => {
    if (!(await isGooglePaySupported({ testEnv: true }))) {
      Alert.alert('Google Pay is not supported.');
      return;
    }

    const { error } = await initGooglePay({
      testEnv: true,
      merchantName: 'Test',
      countryCode: 'US',
      billingAddressConfig: {
        format: 'FULL',
        isPhoneNumberRequired: true,
        isRequired: false,
      },
      existingPaymentMethodRequired: false,
      isEmailRequired: true,
    });

    if (error) {
      Alert.alert(error.code, error.message);
      return;
    }
    setInitialized(true);
  };

  const fetchEphemeralKey = async () => {
    const response = await fetch(`${API_URL}/ephemeral-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiVersion: Constants.API_VERSIONS.ISSUING,
        issuingCardId: LIVE_CARD_ID,
      }),
    });
    const key = await response.json();
    setEphemeralKey(key);
  };

  return (
    <PaymentScreen onInit={initialize}>
      <GooglePayButton
        disabled={!initialized || loading}
        style={styles.payButton}
        type="pay"
        onPress={pay}
      />

      <View style={styles.row}>
        <GooglePayButton
          disabled={!initialized || loading}
          style={styles.standardButton}
          type="standard"
          onPress={createPaymentMethod}
        />
      </View>
      {showAddToWalletButton && (
        <AddToWalletButton
          androidAssetSource={Image.resolveAssetSource(AddToGooglePayPNG)}
          style={styles.payButton}
          cardDetails={{
            name: cardDetails?.cardholder?.name,
            primaryAccountIdentifier:
              cardDetails?.wallet?.primary_account_identifier,
            lastFour: cardDetails?.last4,
            description: 'Added by Stripe',
          }}
          token={androidCardToken}
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
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 30,
  },
  payButton: {
    marginTop: 30,
    width: 152,
    height: 40,
  },
  standardButton: {
    width: 90,
    height: 40,
  },
});
