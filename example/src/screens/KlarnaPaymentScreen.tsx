import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import {
  useConfirmPayment,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function KlarnaPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();
  const { confirmSetupIntent, loading: setupLoading } = useConfirmSetupIntent();

  const fetchClientSecret = async (intentType: 'setup' | 'payment') => {
    const response = await fetch(`${API_URL}/create-${intentType}-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'usd',
        items: ['id-1'],
        payment_method_types: ['klarna'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchClientSecret('payment');

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Klarna',
      paymentMethodData: {
        shippingDetails: {
          address: {
            city: 'Houston',
            country: 'US',
            line1: '1459  Circle Drive',
            state: 'Texas',
            postalCode: '77063',
          },
          email: 'myemail@s.com',
          name: 'John Doe',
        },
        billingDetails: {
          email: 'stripe@test.com',
          address: {
            country: 'US',
          },
        },
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
    }
  };

  const handleSetupPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchClientSecret('setup');

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      paymentMethodType: 'Klarna',
      paymentMethodData: {
        mandateData: {
          customerAcceptance: {
            online: {
              ipAddress: '1.1.1.1',
              userAgent: 'my-agent',
            },
          },
        },
        shippingDetails: {
          address: {
            city: 'Houston',
            country: 'US',
            line1: '1459  Circle Drive',
            state: 'Texas',
            postalCode: '77063',
          },
          email: 'myemail@s.com',
          name: 'John Doe',
        },
        billingDetails: {
          email: 'stripe@test.com',
          address: {
            country: 'US',
          },
        },
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert('Success', `Status: ${setupIntent.status}`);
      console.log('Success from promise', setupIntent);
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

      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
        loading={loading}
      />

      <Button
        variant="primary"
        onPress={handleSetupPress}
        title="Setup"
        accessibilityLabel="Setup"
        loading={setupLoading}
      />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  text: {
    marginLeft: 12,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
    marginBottom: 20,
  },
});
