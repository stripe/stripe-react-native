import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import {
  PaymentMethodCreateParams,
  PaymentIntents,
} from '@stripe/stripe-react-native';

export default function NoWebhookPaymentScreen() {
  const [loading, setLoading] = useState(false);
  const { createPaymentMethod, handleCardAction } = useStripe();

  const callNoWebhookPayEndpoint = async (
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
  };

  const confirmIntent = async (paymentIntentId: string) => {
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
  };

  const handlePayPress = async () => {
    setLoading(true);
    // 1. Gather customer billing information (ex. email)
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    // 2. Create payment method
    const { paymentMethod, error } = await createPaymentMethod({
      type: 'Card',
      billingDetails,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      setLoading(false);
      return;
    }
    if (!paymentMethod) {
      setLoading(false);
      return;
    }

    // 3. call API to create PaymentIntent
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
      return;
    }

    if (clientSecret && !requiresAction) {
      // Payment succedeed
      Alert.alert('Success', 'The payment was confirmed successfully!');
    }

    if (clientSecret && requiresAction) {
      // 4. if payment requires action calling handleCardAction
      const { error: cardActionError, paymentIntent } = await handleCardAction(
        clientSecret
      );

      if (cardActionError) {
        Alert.alert(
          `Error code: ${cardActionError.code}`,
          cardActionError.message
        );
      } else if (paymentIntent) {
        if (
          paymentIntent.status === PaymentIntents.Status.RequiresConfirmation
        ) {
          // 5. Call API to confirm intent
          await confirmIntent(paymentIntent.id);
        } else {
          // Payment succedeed
          Alert.alert('Success', 'The payment was confirmed successfully!');
        }
      }
    }

    setLoading(false);
  };

  return (
    <PaymentScreen>
      <CardField
        onCardChange={(cardDetails) => {
          console.log('cardDetails', cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusedField', focusedField);
        }}
        style={styles.cardField}
        postalCodeEnabled={false}
      />

      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
    </PaymentScreen>
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
