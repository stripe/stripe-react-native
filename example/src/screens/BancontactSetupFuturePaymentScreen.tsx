import {
  PaymentMethodCreateParams,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function BancontactSetupFuturePaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const createSetupIntentOnBackend = async (customerEmail: string) => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        payment_method_types: ['bancontact'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    const clientSecret = await createSetupIntentOnBackend(email);

    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name: 'John Doe',
      email,
    };

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      type: 'Bancontact',
      billingDetails,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup intent confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert(
        'Success',
        `Setup intent created. Intent status: ${setupIntent.status}`
      );
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
        title="Save"
        loading={loading}
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
