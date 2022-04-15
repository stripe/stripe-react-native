import { SetupIntent } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import {
  useConfirmSetupIntent,
  verifyMicrodepositsForSetup,
  VerifyMicrodepositsParams,
  collectBankAccountForSetup,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function ACHSetupScreen() {
  const [name, setName] = useState('David Wallace');
  const [email, setEmail] = useState('reactnativestripe@achtest.com');

  const { confirmSetupIntent, loading } = useConfirmSetupIntent();
  const [secret, setSecret] = useState('');
  const [canConfirm, setCanConfirm] = useState(false);

  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationText, setVerificationText] = useState('32,45');

  const fetchSetupIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        payment_method_types: ['us_bank_account'],
      }),
    });

    const { clientSecret, error } = await response.json();
    return { clientSecret, error };
  };

  const handleConfirmPress = async () => {
    const { error, setupIntent } = await confirmSetupIntent(secret, {
      paymentMethodType: 'USBankAccount',
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (setupIntent) {
      if (setupIntent.status === SetupIntent.Status.Processing) {
        Alert.alert(
          'Processing',
          `The setup has been successfully submitted and is now processing.`
        );
      } else if (setupIntent.status === SetupIntent.Status.Succeeded) {
        Alert.alert('Success', `The setup was confirmed successfully!`);
      } else if (
        setupIntent.status === SetupIntent.Status.RequiresAction &&
        setupIntent?.nextAction?.type === 'verifyWithMicrodeposits'
      ) {
        setAwaitingVerification(true);
        Alert.alert(
          'Awaiting verification:',
          'The setup must be verified. Please provide the verification input values below.'
        );
      } else {
        Alert.alert('Setup status:', setupIntent.status);
      }
      setCanConfirm(false);
    }
  };

  const handleConfirmManualBankAccountParamsPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchSetupIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    setSecret(clientSecret);

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      paymentMethodType: 'USBankAccount',
      paymentMethodData: {
        accountNumber: '000123456789',
        routingNumber: '110000000',
        billingDetails: {
          name: 'David Wallace',
        },
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (setupIntent) {
      if (setupIntent.status === SetupIntent.Status.Processing) {
        Alert.alert(
          'Processing',
          `The setup has been successfully submitted and is now processing.`
        );
      } else if (setupIntent.status === SetupIntent.Status.Succeeded) {
        Alert.alert('Success', `The setup was confirmed successfully!`);
      } else if (
        setupIntent.status === SetupIntent.Status.RequiresAction &&
        setupIntent?.nextAction?.type === 'verifyWithMicrodeposits'
      ) {
        setAwaitingVerification(true);
        Alert.alert(
          'Awaiting verification:',
          'The setup must be verified. Please provide the verification input values below.'
        );
      } else {
        Alert.alert('Setup status:', setupIntent.status);
      }
    }
  };

  const handleCollectBankAccountPress = async () => {
    const { clientSecret, error: clientSecretError } =
      await fetchSetupIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    setSecret(clientSecret);

    const { setupIntent, error } = await collectBankAccountForSetup(
      clientSecret,
      {
        paymentMethodType: 'USBankAccount',
        paymentMethodData: {
          billingDetails: {
            name,
            email,
          },
        },
      }
    );

    if (error) {
      console.log(error);
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (setupIntent) {
      if (setupIntent.status === SetupIntent.Status.RequiresConfirmation) {
        Alert.alert(
          'Setup status: RequiresConfirmation',
          "You may now press the first 'Confirm' button."
        );
      } else {
        if (
          setupIntent.status === SetupIntent.Status.RequiresAction &&
          setupIntent?.nextAction?.type === 'verifyWithMicrodeposits'
        ) {
          setAwaitingVerification(true);
        }
        Alert.alert('Setup status:', setupIntent.status);
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

    const { setupIntent, error } = await verifyMicrodepositsForSetup(
      secret,
      params
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (setupIntent) {
      Alert.alert('Setup status:', setupIntent.status);
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
        <Button
          variant="primary"
          onPress={handleConfirmManualBankAccountParamsPress}
          title="Confirm (pass bank account details directly)"
          accessibilityLabel="Confirm-manual"
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
