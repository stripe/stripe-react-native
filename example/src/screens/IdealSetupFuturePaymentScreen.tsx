import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { colors } from '../colors';
import PaymentScreen from '../components/PaymentScreen';
import type { BillingDetails } from '@stripe/stripe-react-native';

export default function IdealSetupFuturePaymentScreen() {
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState<string | undefined>();

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

  const handlePayPress = async () => {
    const clientSecret = await createSetupIntentOnBackend(email);

    const billingDetails: BillingDetails = {
      email: email,
      name: 'John Doe',
    };

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      paymentMethodType: 'Ideal',
      paymentMethodData: {
        billingDetails,
        bankName,
      },
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
