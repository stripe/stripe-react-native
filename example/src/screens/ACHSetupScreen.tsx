import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
  Text,
  Switch,
  Linking,
  Pressable,
} from 'react-native';
import {
  verifyMicrodepositsForSetup,
  VerifyMicrodepositsParams,
  SetupIntents,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function ACHSetupScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();
  const [secret, setSecret] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verificationText, setVerificationText] = useState('');
  const fetchSetupIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        currency: 'usd',
        items: [{ id: 'id' }],
        payment_method_types: ['us_bank_account'],
      }),
    });
    const { clientSecret, error } = await response.json();
    setSecret(clientSecret);
    return { clientSecret, error };
  };

  const handlePayPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchSetupIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      type: 'USBankAccount',
      billingDetails: { name, email },
      setupFutureUsage: savePaymentMethod ? 'OffSession' : undefined,
      accountNumber,
      routingNumber,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (setupIntent) {
      if (
        setupIntent.status === SetupIntents.Status.RequiresAction &&
        setupIntent?.nextAction?.type === 'verifyWithMicrodeposits'
      ) {
        setVerificationUrl(setupIntent.nextAction.redirectUrl);
      } else {
        Alert.alert('Setup status:', setupIntent.status);
      }
    }
  };

  return (
    <PaymentScreen>
      {verificationUrl ? (
        <View>
          <TextInput
            placeholder="Descriptor code or comma-separated amounts"
            onChange={(value) => setVerificationText(value.nativeEvent.text)}
            style={styles.input}
          />
          <Button
            title="Verify microdeposit"
            onPress={async () => {
              const params: VerifyMicrodepositsParams = verificationText
                .replace(/\s+/g, '')
                .includes(',')
                ? {
                    amounts: verificationText
                      .split(',')
                      .map((v) => parseInt(v, 10)),
                  }
                : { descriptorCode: verificationText };

              const { setupIntent, error } = await verifyMicrodepositsForSetup(
                secret,
                params
              );

              if (error) {
                Alert.alert(`Error code: ${error.code}`, error.message);
              } else if (setupIntent) {
                Alert.alert('Setup status:', setupIntent.status);
              }
            }}
          />
          <Text>Or visit the following Stripe-hosted link to verify: </Text>
          <Pressable
            onPress={async () => await Linking.openURL(verificationUrl)}
          >
            <Text style={styles.link}>{verificationUrl}</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <TextInput
            defaultValue="reactnativestripe@achtest.com"
            onChange={(value) => setEmail(value.nativeEvent.text)}
            style={styles.input}
          />
          <TextInput
            placeholder="Name"
            defaultValue="David Wallace"
            onChange={(value) => setName(value.nativeEvent.text)}
            style={styles.input}
          />
          <TextInput
            placeholder="Account number"
            defaultValue="000123456789"
            onChange={(value) =>
              setAccountNumber(value.nativeEvent.text.toLowerCase())
            }
            style={styles.input}
          />
          <TextInput
            placeholder="Routing number"
            defaultValue="110000000"
            onChange={(value) =>
              setRoutingNumber(value.nativeEvent.text.toLowerCase())
            }
            style={styles.input}
          />
          <Button
            variant="primary"
            onPress={handlePayPress}
            title="Pay"
            accessibilityLabel="Pay"
            loading={loading}
          />
          <View style={styles.row}>
            <Switch
              onValueChange={(value) => setSavePaymentMethod(value)}
              value={savePaymentMethod}
            />
            <Text style={styles.text}>Save payment method for later usage</Text>
          </View>
        </View>
      )}
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
  link: { color: 'blue' },
});
