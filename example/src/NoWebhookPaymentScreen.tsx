import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';
import {
  CardDetails,
  CardFieldNative,
  useStripe,
} from 'react-native-stripe-sdk';
import { API_URL } from './Config';

export default function NoWebhookPaymentScreen() {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardDetails | null>(null);
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
        const {
          requiresConfirmation,
          stripeId,
        } = await handleNextPaymentAction(clientSecret);

        // TODO: handle requiresConfirmation differently.
        // We should base on intent.status (enum) which can be requiresConfirmation
        // instead of manually added boolean value to intent

        if (requiresConfirmation) {
          // 4. Call API to confirm intent
          confirmIntent(stripeId);
        } else {
          // Payment succedeed
          Alert.alert('Success', 'The payment was confirmed successfully!');
        }
      }
    } catch (e) {
      console.log('Paymentconfirmation error', e);
      Alert.alert('Error', e);
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
    <View>
      <CardFieldNative
        value={{
          cardNumber: '4242424242424242',
          cvc: '424',
          expiryMonth: 3,
          expiryYear: 22,
        }}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          setCard(cardDetails.nativeEvent);
        }}
        onFocus={(focusField) => {
          console.log('focusField', focusField.nativeEvent.focusField);
        }}
        style={styles.cardField}
      />
      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardField: {
    marginTop: 300,
    width: '100%',
    height: 50,
  },
});
