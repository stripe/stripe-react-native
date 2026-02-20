import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { BillingDetails, SetupIntent } from '@stripe/stripe-react-native';

export default function NoWebhookSetupScreen() {
  const [loading, setLoading] = useState(false);
  const { createPaymentMethod, handleNextActionForSetup } = useStripe();

  const callNoWebhookSetupEndpoint = async (
    data:
      | {
          useStripeSdk: boolean;
          paymentMethodId: string;
        }
      | { setupIntentId: string }
  ) => {
    const response = await fetch(`${API_URL}/setup-without-webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const confirmSetupIntent = async (setupIntentId: string) => {
    // Call API to confirm setup intent
    const { clientSecret, error, requiresAction } =
      await callNoWebhookSetupEndpoint({
        setupIntentId,
      });

    if (error) {
      // Error during confirming SetupIntent
      Alert.alert('Error', error);
    } else if (clientSecret && !requiresAction) {
      Alert.alert('Success', 'The setup was confirmed successfully!');
    }
  };

  const handleSetupPress = async () => {
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

    // 3. call API to create SetupIntent
    const setupIntentResult = await callNoWebhookSetupEndpoint({
      useStripeSdk: true,
      paymentMethodId: paymentMethod.id,
    });

    const {
      clientSecret,
      error: setupIntentError,
      requiresAction,
    } = setupIntentResult;

    if (setupIntentError) {
      // Error during creating or confirming SetupIntent
      Alert.alert('Error', setupIntentError);
      return;
    }

    if (clientSecret && !requiresAction) {
      // Setup succeeded
      Alert.alert('Success', 'The setup was confirmed successfully!');
    }

    if (clientSecret && requiresAction) {
      // 4. if setup requires action calling handleNextActionForSetup
      const { error: nextActionError, setupIntent } =
        await handleNextActionForSetup(
          clientSecret,
          'com.stripe.react.native://stripe-redirect'
        );

      if (nextActionError) {
        Alert.alert(
          `Error code: ${nextActionError.code}`,
          nextActionError.message
        );
      } else if (setupIntent) {
        if (setupIntent.status === SetupIntent.Status.RequiresConfirmation) {
          // 5. Call API to confirm setup intent
          await confirmSetupIntent(setupIntent.id);
        } else {
          // Setup succeeded
          Alert.alert('Success', 'The setup was confirmed successfully!');
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
        autofocus
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
        onPress={handleSetupPress}
        title="Setup Payment Method"
        accessibilityLabel="Setup Payment Method"
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
