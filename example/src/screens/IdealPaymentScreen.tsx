import type { PaymentMethodCreateParams } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View, Text, Switch } from 'react-native';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function IdealPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();
  const [bankName, setBankName] = useState<string>();
  const [saveIban, setSaveIban] = useState(false);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'eur',
        items: [{ id: 'id' }],
        request_three_d_secure: 'any',
        payment_method_types: ['ideal'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const {
      clientSecret,
      error: clientSecretError,
    } = await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Ideal',
      billingDetails,
      bankName,
      setupFutureUsage: saveIban ? 'OffSession' : undefined,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
      console.log('Success from promise', paymentIntent);
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
        onChange={(value) => {
          const text =
            value.nativeEvent.text.length > 0
              ? value.nativeEvent.text.toLowerCase()
              : undefined;
          setBankName(text);
        }}
        style={styles.input}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
      <View style={styles.row}>
        <Switch
          onValueChange={(value) => setSaveIban(value)}
          value={saveIban}
        />
        <Text style={styles.text}>Save IBAN during payment</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
