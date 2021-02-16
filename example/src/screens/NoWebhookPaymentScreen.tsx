import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import {
  BillingDetails,
  CardDetails,
  CardField,
  IntentStatus,
  useStripe,
} from 'stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import Screen from '../components/Screen';

export default function NoWebhookPaymentScreen() {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardDetails | null>(null);
  const { createPaymentMethod, handleCardAction } = useStripe();

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
      } else if (clientSecret && !requiresAction) {
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
    // 2. Gather customer billing information (ex. email)
    const billingDetails: BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    // 1. Create payment method
    const { paymentMethod, error } = await createPaymentMethod({
      type: 'Card',
      cardDetails: card,
      billingDetails,
    });

    if (error) {
      console.log('Create payment method error', error);
      Alert.alert(`Error code: ${error.code}`, error.message);
    }
    if (!paymentMethod) {
      return;
    }

    // 2. call API to create PaymentIntent
    const paymentIntentResult = await callNoWebhookPayEndpoint({
      useStripeSdk: true,
      paymentMethodId: paymentMethod.id,
      currency: 'usd', // mocked data
      items: [{ id: 'id' }],
    });

    const {
      clientSecret,
      error: paymentIntentError,
      requiresAction,
    } = paymentIntentResult;

    if (paymentIntentError) {
      // Error during creating or confirming Intent
      Alert.alert('Error', paymentIntentError);
    }

    if (clientSecret && !requiresAction) {
      // Payment succedeed
      Alert.alert('Success', 'The payment was confirmed successfully!');
    }

    if (clientSecret && requiresAction) {
      // 3. if payment requires action calling handleCardAction
      const { error: cardActionError, paymentIntent } = await handleCardAction(
        clientSecret
      );

      if (cardActionError) {
        console.log('Payment confirmation error', cardActionError);
        Alert.alert(
          `Error code: ${cardActionError.code}`,
          cardActionError.message
        );
      }

      if (!paymentIntent) {
        return;
      }

      if (paymentIntent.status === IntentStatus.RequiresConfirmation) {
        // 4. Call API to confirm intent
        await confirmIntent(paymentIntent.id);
      } else {
        // Payment succedeed
        Alert.alert('Success', 'The payment was confirmed successfully!');
      }
    }

    setLoading(false);
  }, [
    card,
    createPaymentMethod,
    callNoWebhookPayEndpoint,
    confirmIntent,
    handleCardAction,
  ]);

  return (
    <Screen>
      <CardField
        postalCodeEnabled={true}
        onCardChange={(cardDetails) => {
          console.log('cardDetails', cardDetails);
          setCard(cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusedField', focusedField);
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
  container: {
    flex: 1,
    padding: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 20,
  },
});
