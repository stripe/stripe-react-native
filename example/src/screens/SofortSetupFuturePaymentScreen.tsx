import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { colors } from '../colors';
import PaymentScreen from '../components/PaymentScreen';
import type { BillingDetails } from '@stripe/stripe-react-native';

export default function SofortSetupFuturePaymentScreen() {
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
        payment_method_types: ['sofort'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    const clientSecret = await createSetupIntentOnBackend(email);

    const billingDetails: BillingDetails = {
      email: email,
      name: 'John Doe',
    };

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      type: 'Sofort',
      billingDetails,
      country: 'DE',
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

      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handlePayPress}
          title="Save"
          loading={loading}
          disabled={!email}
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
    marginBottom: 20,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
  },
});
