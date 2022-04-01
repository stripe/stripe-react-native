import { PaymentIntents } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import {
  useConfirmPayment,
  verifyMicrodepositsForPayment,
  VerifyMicrodepositsParams,
  collectBankAccountForPayment,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function ACHPaymentScreen() {
  const [name, setName] = useState('David Wallace');
  const [email, setEmail] = useState('reactnativestripe@achtest.com');

  const { confirmPayment, loading } = useConfirmPayment();
  const [secret, setSecret] = useState('');
  const [canConfirm, setCanConfirm] = useState(false);

  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationText, setVerificationText] = useState('32,45');

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
    return { clientSecret, error };
  };

  const handleConfirmPress = async () => {
    const { error, paymentIntent } = await confirmPayment(secret, {
      type: 'USBankAccount',
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
        setAwaitingVerification(true);
        Alert.alert(
          'Awaiting verification:',
          'The payment must be verified. Please provide the verification input values below.'
        );
      } else {
        Alert.alert('Payment status:', paymentIntent.status);
      }
      setCanConfirm(false);
    }
  };

  const handleCollectBankAccountPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    setSecret(clientSecret);

    const { paymentIntent, error } = await collectBankAccountForPayment(
      clientSecret,
      {
        type: 'USBankAccount',
        billingDetails: {
          name,
          email,
        },
      }
    );

    if (error) {
      console.log(error);
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      if (paymentIntent.status === PaymentIntents.Status.RequiresConfirmation) {
        Alert.alert(
          'Payment status: RequiresConfirmation',
          "You may now press the 'Confirm' button."
        );
      } else {
        if (
          paymentIntent.status === PaymentIntents.Status.RequiresAction &&
          paymentIntent?.nextAction?.type === 'verifyWithMicrodeposits'
        ) {
          setAwaitingVerification(true);
        }
        Alert.alert('Payment status:', paymentIntent.status);
      }
      setCanConfirm(true);
    }
  };

  const hanldeVerifyPress = async () => {
    const params: VerifyMicrodepositsParams = verificationText
      .replace(/\s+/g, '')
      .includes(',')
      ? {
          amounts: verificationText.split(',').map((v) => parseInt(v, 10)),
        }
      : { descriptorCode: verificationText };

    const { paymentIntent, error } = await verifyMicrodepositsForPayment(
      secret,
      params
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      Alert.alert('Payment status:', paymentIntent.status);
      setAwaitingVerification(false);
    }
  };

  return (
    <PaymentScreen>
      <View>
        <TextInput
          placeholder="Name"
          defaultValue="David Wallace"
          onChange={(value) => setName(value.nativeEvent.text)}
          style={styles.input}
        />
        <TextInput
          defaultValue="reactnativestripe@achtest.com"
          onChange={(value) => setEmail(value.nativeEvent.text)}
          style={styles.input}
        />
        <Button
          variant="primary"
          onPress={handleCollectBankAccountPress}
          title="Collect bank account"
          accessibilityLabel="Collect bank account"
        />
        <Button
          variant="primary"
          onPress={handleConfirmPress}
          title="Confirm"
          disabled={!canConfirm}
          accessibilityLabel="Confirm"
          loading={loading}
        />
      </View>
      {awaitingVerification && (
        <View>
          <TextInput
            placeholder="Descriptor code or comma-separated amounts"
            onChange={(value) => setVerificationText(value.nativeEvent.text)}
            style={styles.input}
          />
          <Button
            variant="primary"
            onPress={hanldeVerifyPress}
            title="Verify microdeposit"
            accessibilityLabel="Verify microdeposit"
          />
        </View>
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
    marginBottom: 20,
  },
  link: { color: 'blue' },
});
