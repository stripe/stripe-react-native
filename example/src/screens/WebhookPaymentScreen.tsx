import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { CardField, useConfirmPayment } from 'stripe-react-native';
import type {
  CardFieldInput,
  CreatePaymentMethod,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function WebhookPaymentScreen() {
  const [card, setCard] = useState<CardFieldInput.Details | null>();

  const { confirmPayment, loading } = useConfirmPayment({
    onError: (error) => {
      Alert.alert(`Error code: ${error.code}`, error.message);
    },
    onSuccess: (intent) => {
      console.log('Success', intent);
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${intent.currency}`
      );
    },
  });

  const fetchPaymentIntentClientSecret = useCallback(async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id' }],
        request_three_d_secure: 'any',
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      // 1. fetch Intent Client Secret from backend
      const clientSecret = await fetchPaymentIntentClientSecret();

      // 2. Gather customer billing information (ex. email)
      const billingDetails: CreatePaymentMethod.BillingDetails = {
        email: 'email@stripe.com',
        phone: '+48888000888',
        addressCity: 'Houston',
        addressCountry: 'US',
        addressLine1: '1459  Circle Drive',
        addressLine2: 'Texas',
        addressPostalCode: '77063',
      }; // mocked data for tests

      // 3. Confirm payment with card details
      // The rest will be done automatically using webhooks
      const intent = await confirmPayment(clientSecret, {
        type: 'Card',
        billingDetails,
        cardDetails: card,
      });
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Payment confirmation error', e.message);
    }
  }, [card, confirmPayment, fetchPaymentIntentClientSecret]);

  return (
    <Screen>
      <CardField
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusField', focusedField);
        }}
        style={styles.cardField}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 20,
  },
});
