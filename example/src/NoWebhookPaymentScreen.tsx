import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';
import {
  CardDetails,
  CardField,
  IntentStatus,
  useStripe,
} from 'react-native-stripe-sdk';
import { API_URL } from './Config';

const defaultCard = {
  cardNumber: '4242424242424242',
  cvc: '424',
  expiryMonth: 3,
  expiryYear: 22,
};

export default function NoWebhookPaymentScreen() {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardDetails | undefined>(defaultCard);
  const { createPaymentMethod, handleNextPaymentAction } = useStripe();

  const callNoWebhookPayEndpoint = useCallback(
    async (
      data:
        | {
            useStripeSdk: boolean;
            paymentMethodId: string;
            currency: string;
            items: { id: string }[];
          }
        | { paymentIntentId: string }
    ) => {
      const response = await fetch(`${API_URL}/pay-without-webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    []
  );

  const confirmIntent = useCallback(
    async (paymentIntentId: string) => {
      // Call API to confirm intent
      const {
        clientSecret,
        error,
        requiresAction,
      } = await callNoWebhookPayEndpoint({
        paymentIntentId,
      });

      if (error) {
        // Error during confirming Intent
        Alert.alert('Error', error);
      } else if (!clientSecret && !requiresAction) {
        Alert.alert('Success', 'The payment was confirmed successfully!');
      }
    },
    [callNoWebhookPayEndpoint]
  );

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    setLoading(true);
    try {
      // 1. Create payment method
      const paymentMethod = await createPaymentMethod(card);

      // 2. call API to crfeate and get Intent
      const result = await callNoWebhookPayEndpoint({
        useStripeSdk: true,
        paymentMethodId: paymentMethod.stripeId,
        currency: 'usd', // mocked data
        items: [{ id: 'id' }],
      });

      const { clientSecret, error, requiresAction } = result;

      if (error) {
        // Error during creating or confirming Intent
        Alert.alert('Error', error);
      }

      if (clientSecret && !requiresAction) {
        // Payment succedeed
        Alert.alert('Success', 'The payment was confirmed successfully!');
      }

      if (clientSecret && requiresAction) {
        // 3. if payment requires action calling handleNextPaymentAction
        const { status, stripeId } = await handleNextPaymentAction(
          clientSecret
        );

        if (status === IntentStatus.RequiresConfirmation) {
          // 4. Call API to confirm intent
          confirmIntent(stripeId);
        } else {
          // Payment succedeed
          Alert.alert('Success', 'The payment was confirmed successfully!');
        }
      }
    } catch (e) {
      console.log('Paymentconfirmation error', e);
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  }, [
    card,
    createPaymentMethod,
    callNoWebhookPayEndpoint,
    confirmIntent,
    handleNextPaymentAction,
  ]);

  return (
    <View style={styles.container}>
      <CardField
        value={defaultCard}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          console.log('cardDetails', cardDetails);
          setCard(cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusedField', focusedField);
        }}
        style={styles.cardField}
      />
      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
});
