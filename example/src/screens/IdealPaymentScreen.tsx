import type { PaymentMethodCreateParams } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View, Text, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function IdealPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();
  const [bankName, setBankName] = useState<string | undefined>();
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
    <PaymentScreen>
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <Picker
        selectedValue={bankName}
        onValueChange={(itemValue) => setBankName(itemValue)}
      >
        <Picker.Item label="Optional - choose your bank" />
        <Picker.Item label="ABN Amro" value="abn_amro" />
        <Picker.Item label="ASN Bank" value="asn_bank" />
        <Picker.Item label="bunq B.V." value="bunq" />
        <Picker.Item label="Handelsbanken" value="handelsbanken" />
        <Picker.Item label="ING Bank" value="ing" />
        <Picker.Item label="Knab" value="knab" />
        <Picker.Item label="Moneyou" value="moneyou" />
        <Picker.Item label="Rabobank" value="rabobank" />
        <Picker.Item label="Regiobank" value="regiobank" />
        <Picker.Item label="Revolut" value="revolut" />
        <Picker.Item label="SNS Bank" value="sns_bank" />
        <Picker.Item label="Triodos Bank" value="triodos_bank" />
        <Picker.Item label="Van Lanschot" value="van_lanschot" />
      </Picker>
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
