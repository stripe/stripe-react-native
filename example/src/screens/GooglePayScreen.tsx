import React, { useEffect, useState } from 'react';
import {
  AddToWalletButton,
  Constants,
  canAddCardToWallet,
  createPlatformPayPaymentMethod,
  createPlatformPayToken,
  confirmPlatformPayPayment,
  GooglePayCardToken,
  isPlatformPaySupported,
  PlatformPay,
  PlatformPayButton,
} from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { Alert, StyleSheet, View, Image } from 'react-native';
// @ts-ignore
import AddToGooglePayPNG from '../assets/Add-to-Google-Pay-Button-dark-no-shadow.png';

const LIVE_CARD_ID = 'ic_1KnTM2F05jLespP6wNLZQ1mu';

export default function GooglePayScreen() {
  const [isGooglePaySupported, setIsGooglePaySupported] = useState(false);
  const [ephemeralKey, setEphemeralKey] = useState({});
  const [showAddToWalletButton, setShowAddToWalletButton] = useState(true);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [androidCardToken, setAndroidCardToken] =
    useState<null | GooglePayCardToken>(null);
  const [clientSecret, setClientSecret] = useState<String | null>(null);

  useEffect(() => {
    fetchEphemeralKey();
    checkIfCardInWallet();
    checkIfGooglePayIsSupported();
    fetchPaymentIntentClientSecret();
  }, []);

  const checkIfGooglePayIsSupported = async () => {
    setIsGooglePaySupported(await isPlatformPaySupported());
  };

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
        items: ['id-1'],
        force3dSecure: true,
      }),
    });
    const result = await response.json();
    if (!result.clientSecret) {
      Alert.alert('Error fetching client secret.', result.error);
    }
    setClientSecret(result.clientSecret);
  };

  const pay = async () => {
    const { error, paymentIntent } = await confirmPlatformPayPayment(
      clientSecret as string,
      {
        googlePay: {
          testEnv: true,
          merchantName: 'Test',
          merchantCountryCode: 'US',
          currencyCode: 'usd',
          billingAddressConfig: {
            format: PlatformPay.BillingAddressFormat.Full,
            isPhoneNumberRequired: true,
            isRequired: true,
          },
        },
      }
    );

    if (error) {
      Alert.alert('Failure', error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for payment intent details.');
      console.log(JSON.stringify(paymentIntent, null, 2));
      setClientSecret(null);
    }
  };

  /*
    As an alternative you can only create a paymentMethod instead of confirming the payment.
  */
  const createPaymentMethod = async () => {
    const { error, paymentMethod, shippingContact } =
      await createPlatformPayPaymentMethod({
        googlePay: {
          amount: 12,
          currencyCode: 'USD',
          testEnv: true,
          merchantName: 'Test',
          merchantCountryCode: 'US',
          billingAddressConfig: {
            format: PlatformPay.BillingAddressFormat.Full,
            isPhoneNumberRequired: true,
            isRequired: true,
          },
          shippingAddressConfig: {
            isRequired: true,
          },
          isEmailRequired: true,
        },
      });

    if (error) {
      Alert.alert('Failure', error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for payment method details.');
      console.log(JSON.stringify(paymentMethod, null, 2));
      console.log(JSON.stringify(shippingContact, null, 2));
    }
  };

  const createToken = async () => {
    const { error, token, shippingContact } = await createPlatformPayToken({
      googlePay: {
        amount: 12,
        currencyCode: 'USD',
        testEnv: true,
        merchantName: 'Test',
        merchantCountryCode: 'US',
        billingAddressConfig: {
          format: PlatformPay.BillingAddressFormat.Full,
          isPhoneNumberRequired: true,
          isRequired: true,
        },
        shippingAddressConfig: {
          isRequired: true,
        },
        isEmailRequired: true,
      },
    });

    if (error) {
      Alert.alert('Failure', error.localizedMessage);
    } else {
      Alert.alert('Success', 'Check the logs for token details.');
      console.log(JSON.stringify(token, null, 2));
      console.log(JSON.stringify(shippingContact, null, 2));
    }
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
    <PaymentScreen>
      <View style={styles.row}>
        <PlatformPayButton
          disabled={!isGooglePaySupported || !clientSecret}
          style={styles.donateButton}
          type={PlatformPay.ButtonType.Donate}
          borderRadius={0}
          onPress={pay}
        />
      </View>

      <View style={styles.row}>
        <PlatformPayButton
          disabled={!isGooglePaySupported}
          style={styles.standardButton}
          type={PlatformPay.ButtonType.GooglePayMark}
          appearance={PlatformPay.ButtonStyle.White}
          borderRadius={25}
          onPress={createPaymentMethod}
        />

        <PlatformPayButton
          disabled={!isGooglePaySupported}
          style={styles.buyButton}
          onPress={createToken}
        />
      </View>
      {showAddToWalletButton && isGooglePaySupported && (
        <View style={styles.row}>
          <AddToWalletButton
            androidAssetSource={Image.resolveAssetSource(AddToGooglePayPNG)}
            style={styles.addToWalletButton}
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
        </View>
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 30,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  donateButton: {
    width: 222,
    height: 48,
  },
  standardButton: {
    width: 112,
    height: 48,
  },
  buyButton: {
    width: 202,
    height: 48,
  },
  addToWalletButton: {
    width: 190,
    height: 60,
  },
});
