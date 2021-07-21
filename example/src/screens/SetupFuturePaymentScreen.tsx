import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import {
  CardField,
  useConfirmPayment,
  useConfirmSetupIntent,
  useStripe,
} from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { colors } from '../colors';
import PaymentScreen from '../components/PaymentScreen';
import type {
  PaymentMethodCreateParams,
  PaymentIntent,
  SetupIntent,
} from '@stripe/stripe-react-native';

export default function SetupFuturePaymentScreen() {
  const [email, setEmail] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>();
  const [offSessionLoading, setOffSessionLoading] = useState(false);
  const [
    retrievedPaymentIntent,
    setRetrievedPaymentIntent,
  ] = useState<PaymentIntent | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntent | null>(null);

  // It is also possible to use `useStripe` and then `stripe.confirmSetupIntent`
  // The only difference is that this approach will not have `loading` status support
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const {
    confirmPayment,
    loading: confirmPaymentLoading,
  } = useConfirmPayment();

  const { retrievePaymentIntent } = useStripe();

  const createSetupIntentOnBackend = async (customerEmail: string) => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: customerEmail }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const chargeCardOffSession = async () => {
    const response = await fetch(`${API_URL}/charge-card-off-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    console.log('email', email);
    // 1. Create setup intent on backend
    const clientSecret = await createSetupIntentOnBackend(email);

    // 2. Gather customer billing information (ex. email)
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      email: email,
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    // 3. Confirm setup intent
    const { error, setupIntent: setupIntentResult } = await confirmSetupIntent(
      clientSecret,
      {
        type: 'Card',
        billingDetails,
      }
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup intent confirmation error', error.message);
    } else if (setupIntentResult) {
      Alert.alert(
        'Success',
        `Setup intent created. Intent status: ${setupIntentResult.status}`
      );

      setSetupIntent(setupIntentResult);
    }
  };

  // It's only for example purposes
  // This action is responsible for charging your previously added card and should be called independently of the payment flow.
  const handleOffSessionPayment = async () => {
    setOffSessionLoading(true);
    const res = await chargeCardOffSession();
    if (res.error) {
      // If the PaymentIntent has any other status, the payment did not succeed and the request fails.
      // Notify your customer e.g., by email, text, push notification) to complete the payment.
      // We recommend creating a recovery flow in your app that shows why the payment failed initially and lets your customer retry.
      handleRetrievePaymentIntent(res.clientSecret);
    } else {
      Alert.alert('Success!', 'The payment was confirmed successfully!');
    }

    setOffSessionLoading(false);

    console.log('charge off session result', res);
  };

  // When customer back to the App to complete the payment, retrieve the PaymentIntent via clientSecret.
  // Check the PaymentIntent’s lastPaymentError to inspect why the payment attempt failed.
  // For card errors, you can show the user the last payment error’s message. Otherwise, you can show a generic failure message.
  const handleRetrievePaymentIntent = async (clientSecret: string) => {
    const { error, paymentIntent } = await retrievePaymentIntent(clientSecret);

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      const errorCode = paymentIntent.lastPaymentError?.code;

      let failureReason = 'Payment failed, try again.'; // Default to a generic error message
      if (paymentIntent?.lastPaymentError?.type === 'card_error') {
        failureReason = paymentIntent.lastPaymentError.message;
      }

      if (errorCode) {
        Alert.alert(failureReason);
        setPaymentError(errorCode);
      }
      // If the last payment error is authentication_required allow customer to complete the payment without asking your customers to re-enter their details.
      if (errorCode === 'authentication_required') {
        // Allow to complete the payment with the existing PaymentMethod.
      } else {
        // Collect a new PaymentMethod from the customer...
      }
      setRetrievedPaymentIntent(paymentIntent);
    }
  };

  // If the payment failed because it requires authentication, try again with the existing PaymentMethod instead of creating a new one.
  // Otherwise collect new details and create new PaymentMethod.
  const handleRecoveryFlow = async () => {
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      email: email,
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    if (retrievedPaymentIntent?.lastPaymentError?.paymentMethod.id) {
      const { error } = await confirmPayment(
        retrievedPaymentIntent.clientSecret,
        {
          type: 'Card',
          billingDetails,
          paymentMethodId:
            retrievedPaymentIntent?.lastPaymentError?.paymentMethod.id,
        }
      );
      if (error) {
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else {
        Alert.alert('Success', 'The payment was confirmed successfully!');
      }
    }
  };

  return (
    <PaymentScreen>
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <CardField
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          console.log('card details', cardDetails);
        }}
        style={styles.cardField}
      />
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handlePayPress}
          title="Save"
          loading={loading}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handleOffSessionPayment}
          title="Pay with saved card off-session"
          disabled={!setupIntent}
          loading={offSessionLoading}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handleRecoveryFlow}
          title="Authenticate payment (recovery flow)"
          loading={confirmPaymentLoading}
          disabled={paymentError !== 'authentication_required'}
        />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  emailField: {
    borderWidth: 1,
    borderColor: 'lightgrey',
    borderRadius: 6,
    marginVertical: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
  },
});
