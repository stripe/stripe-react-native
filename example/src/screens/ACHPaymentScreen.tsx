import { PaymentIntents } from '@stripe/stripe-react-native';
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
  useConfirmPayment,
  verifyMicrodepositsForPayment,
  VerifyMicrodepositsParams,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function ACHPaymentScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();
  const [secret, setSecret] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verificationText, setVerificationText] = useState('');
  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
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
      await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'USBankAccount',
      billingDetails: { name, email },
      setupFutureUsage: savePaymentMethod ? 'OffSession' : undefined,
      accountNumber,
      routingNumber,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      if (paymentIntent.status === PaymentIntents.Status.Processing) {
        Alert.alert(
          'Processing',
          `The debit has been successfully submitted and is now processing.`
        );
      } else if (paymentIntent.status === PaymentIntents.Status.Succeeded) {
        Alert.alert(
          'Success',
          `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
        );
      } else if (
        paymentIntent.status === PaymentIntents.Status.RequiresAction &&
        paymentIntent?.nextAction?.type === 'verifyWithMicrodeposits'
      ) {
        setVerificationUrl(paymentIntent.nextAction.redirectUrl);
      } else {
        Alert.alert('Payment status:', paymentIntent.status);
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

              const { paymentIntent, error } =
                await verifyMicrodepositsForPayment(secret, params);

              if (error) {
                Alert.alert(`Error code: ${error.code}`, error.message);
              } else if (paymentIntent) {
                Alert.alert('Payment status:', paymentIntent.status);
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
