import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useConfirmSetupIntent } from 'stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { colors } from '../colors';
import Screen from '../components/Screen';
import type { CreatePaymentMethod } from 'stripe-react-native';

export default function IdealSetupFuturePaymentScreen() {
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');

  // It is also possible to use `useStripe` and then `stripe.confirmSetupIntent`
  // The only difference is that this approach will not have `loading` status support
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const createSetupIntentOnBackend = async (customerEmail: string) => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        payment_method_types: ['ideal'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  // const chargeCardOffSession = async () => {
  //   const response = await fetch(`${API_URL}/charge-card-off-session`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ email: email }),
  //   });
  //   const { clientSecret, error } = await response.json();

  //   return { clientSecret, error };
  // };

  const handlePayPress = async () => {
    console.log('email', email);
    // 1. Create setup intent on backend
    const clientSecret = await createSetupIntentOnBackend(email);

    // 2. Gather customer billing information (ex. email)
    const billingDetails: CreatePaymentMethod.BillingDetails = {
      email: email,
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    // 3. Confirm setup intent
    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      type: 'Ideal',
      billingDetails,
      bankName,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup intent confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert(
        `Success: Setup intent created. Intent status: ${setupIntent.status}`
      );
    }
  };

  return (
    <Screen>
      <TextInput
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />

      <TextInput
        placeholder="Bank name"
        onChange={(value) => setBankName(value.nativeEvent.text)}
        style={styles.input}
      />

      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handlePayPress}
          title="Save"
          loading={loading}
          disabled={!bankName || !email}
        />
      </View>
    </Screen>
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
