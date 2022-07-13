import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { BillingDetails, PaymentIntent } from '@stripe/stripe-react-native';

export default function NoWebhookPaymentScreen() {
  const [loading, setLoading] = useState(false);
  const { createPaymentMethod, handleNextAction } = useStripe();

  const callNoWebhookPayEndpoint = async (
    data:
      | {
          useStripeSdk: boolean;
          paymentMethodId: string;
          currency: string;
          items: string[];
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
    const { clientSecret, error, requiresAction } =
      await callNoWebhookPayEndpoint({
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
    const billingDetails: BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      address: {
        city: 'Houston',
        country: 'US',
        line1: '1459  Circle Drive',
        line2: 'Texas',
        postalCode: '77063',
      },
    }; // mocked data for tests

    // 2. Create payment method
    const { paymentMethod, error } = await createPaymentMethod({
      paymentMethodType: 'Card',
      paymentMethodData: { billingDetails },
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
      items: ['id-1'],
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
      // 4. if payment requires action calling handleNextAction
      const { error: nextActionError, paymentIntent } = await handleNextAction(
        clientSecret
      );

      if (nextActionError) {
        Alert.alert(
          `Error code: ${nextActionError.code}`,
          nextActionError.message
        );
      } else if (paymentIntent) {
        if (
          paymentIntent.status === PaymentIntent.Status.RequiresConfirmation
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

  const cardStyle = {
    borderWidth: 4,
    borderColor: '#A020F0',
    borderRadius: 10,
    textColor: '#0000ff',
    placeholderColor: '#FFC0CB',
    textErrorColor: 'red',
    cursorColor: '#ffff00',
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
        cardStyle={cardStyle}
      />

      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
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
