import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  TextInput,
  Image,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useStripe } from '@stripe/stripe-react-native';
import { Picker } from '@react-native-picker/picker';
import { CryptoNetwork } from '../../../src/types/CryptoNetwork';

export default function CryptoOnrampScreen() {
  const {
    lookupLinkUser,
    presentOnrampVerificationFlow,
    promptOnrampIdentityVerification,
    presentOnrampCollectPaymentFlow,
  } = useStripe();
  const [email, setEmail] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState<boolean | null>(false);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [cardPaymentMethod] = useState<string | null>('Card');
  const [bankAccountPaymentMethod] = useState<string | null>('BankAccount');

  const [paymentDisplayData, setPaymentDisplayData] =
    useState<PaymentOptionData | null>(null);

  const checkIsLinkUser = useCallback(async () => {
    setResponse(null);
    try {
      const result = await lookupLinkUser(email);
      const verified = result ?? false;

      setIsLinkUser(verified);
      setResponse(`Is Link User: ${verified}`);
    } catch (error: any) {
      setResponse(
        `Error: ${error?.message || 'An error occurred while checking link user.'}`
      );
    }
  }, [email, lookupLinkUser]);

  const handlePresentVerification = useCallback(async () => {
    try {
      const result = await presentOnrampVerificationFlow();

      if (result != null) {
        setCustomerId(result);
      } else {
        Alert.alert('Cancelled', 'Authentication cancelled, please try again.');
      }
    } catch (error) {
      Alert.alert('Error', `Authentication Failed: ${error}.`);
    }
  }, [presentOnrampVerificationFlow]);

  const handleVerifyIdentity = useCallback(async () => {
    try {
      const result = await promptOnrampIdentityVerification();

      if (result) {
        Alert.alert('Success', 'Identity Verification completed');
      } else {
        Alert.alert(
          'Cancelled',
          'Identity Verification cancelled, please try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', `Could not verify identity ${error}.`);
    }
  }, [promptOnrampIdentityVerification]);

  const handleCollectCardPayment = useCallback(async () => {
    try {
      const result = await presentOnrampCollectPaymentFlow(cardPaymentMethod);

      if (result) {
        setPaymentDisplayData(result);
      } else {
        Alert.alert(
          'Cancelled',
          'Payment collection cancelled, please try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', `Could not collect payment ${error}.`);
    }
  }, [cardPaymentMethod, presentOnrampCollectPaymentFlow]);

  const handleCollectBankAccountPayment = useCallback(async () => {
    try {
      const result = await presentOnrampCollectPaymentFlow(
        bankAccountPaymentMethod
      );

      if (result) {
        setPaymentDisplayData(result);
      } else {
        Alert.alert(
          'Cancelled',
          'Payment collection cancelled, please try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', `Could not collect payment ${error}.`);
    }
  }, [bankAccountPaymentMethod, presentOnrampCollectPaymentFlow]);

  return (
    <ScrollView accessibilityLabel="onramp-flow" style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Enter your email address:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLinkUser}
        />

        <View style={styles.buttonContainer}>
          {response && <Text style={styles.responseText}>{response}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          {customerId && (
            <Text style={styles.responseText}>
              {'Customer ID: ' + customerId}
            </Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          {paymentDisplayData && (
            <Image
              source={{ uri: paymentDisplayData.icon }}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          )}
          {paymentDisplayData && (
            <Text style={styles.responseText}>
              {'Payment Method Label: ' + paymentDisplayData.label}
            </Text>
          )}
          {paymentDisplayData && (
            <Text style={styles.responseText}>
              {'Payment Method Sublabel: ' + paymentDisplayData.sublabel}
            </Text>
          )}
        </View>

        {isLinkUser === false && (
          <Button title="Verify Link User" onPress={checkIsLinkUser} />
        )}

        {isLinkUser === true && customerId === null && (
          <Button
            title="Authenticate Link User"
            onPress={handlePresentVerification}
          />
        )}

        {isLinkUser === true && customerId != null && (
          <Button title="Verify Identity" onPress={handleVerifyIdentity} />
        )}

        {isLinkUser === true && customerId != null && (
          <Button
            title="Collect Card Payment"
            onPress={handleCollectCardPayment}
          />
        )}

        {isLinkUser === true && customerId != null && (
          <Button
            title="Collect Bank Account Payment"
            onPress={handleCollectBankAccountPayment}
          />
        )}

        {isLinkUser === true && customerId != null && (
          <RegisterWalletAddressScreen />
        )}
      </View>
    </ScrollView>
  );
}

export function RegisterWalletAddressScreen() {
  const { registerWalletAddress } = useStripe();
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState<CryptoNetwork>(CryptoNetwork.bitcoin); // or let user select
  const [response, setResponse] = useState<string | null>(null);

  const handleRegisterWallet = useCallback(async () => {
    setResponse(null);
    try {
      await registerWalletAddress(walletAddress, network);
      setResponse(`Wallet registered`);
    } catch (error: any) {
      setResponse(`Error: ${error?.message || 'Failed to register wallet.'}`);
      Alert.alert('Error', error?.message || 'Failed to register wallet.');
    }
  }, [walletAddress, network, registerWalletAddress]);

  return (
    <View style={{ padding: 16 }}>
      <Text>Wallet Address:</Text>
      <TextInput
        value={walletAddress}
        onChangeText={setWalletAddress}
        placeholder="Enter wallet address"
        style={styles.textInput}
      />
      <Text>Network:</Text>
      <Picker
        selectedValue={network}
        onValueChange={(itemValue) => setNetwork(itemValue as CryptoNetwork)}
        style={styles.textInput}
      >
        {Object.values(CryptoNetwork).map((n) => (
          <Picker.Item
            key={String(n)}
            label={String(n).charAt(0).toUpperCase() + String(n).slice(1)}
            value={n}
          />
        ))}
      </Picker>
      <Text style={{ marginBottom: 8 }}>
        Selected Network: {String(network)}
      </Text>
      <Button title="Register Wallet Address" onPress={handleRegisterWallet} />
      {response && <Text style={{ marginTop: 12 }}>{response}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoContainer: {
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  responseText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.dark_gray,
  },
});
