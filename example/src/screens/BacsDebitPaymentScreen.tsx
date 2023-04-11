import { PaymentIntent, BillingDetails } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function BacsPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [canPay, setCanPay] = useState(true);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'gbp',
        items: ['id-1'],
        payment_method_types: ['bacs_debit'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const billingDetails: BillingDetails = {
      name: 'John Doe',
      email: email,
      address: {
        country: 'UK',
        line1: 'test',
        city: 'test',
      },
    };
    setCanPay(false);
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'BacsDebit',
      paymentMethodData: { billingDetails, sortCode, accountNumber },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      if (paymentIntent.status === PaymentIntent.Status.Processing) {
        Alert.alert(
          'Processing',
          `The debit has been successfully submitted and is now processing.`
        );
      } else if (paymentIntent.status === PaymentIntent.Status.Succeeded) {
        Alert.alert(
          'Success',
          `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
        );
      } else {
        Alert.alert('Payment status:', paymentIntent.status);
      }
    }
    setCanPay(true);
  };

  return (
    <PaymentScreen paymentMethod="bacs_debit">
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="characters"
        placeholder="sortCode"
        onChange={(value) => setSortCode(value.nativeEvent.text.toLowerCase())}
        style={styles.input}
      />

      <TextInput
        autoCapitalize="characters"
        placeholder="accountNumber"
        onChange={(value) =>
          setAccountNumber(value.nativeEvent.text.toLowerCase())
        }
        style={styles.input}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        disabled={!canPay}
        accessibilityLabel="Pay"
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
