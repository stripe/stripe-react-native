import { Picker } from '@react-native-picker/picker';
import {
  PlatformPay,
  PlatformPayButton,
  useStripe,
} from '@stripe/stripe-react-native';

import {
  useOnramp,
  PaymentOptionData,
  CryptoNetwork,
} from '@stripe/stripe-react-native/onramp';

import { addListener } from '@stripe/stripe-react-native/src/events';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { Collapse } from '../components/Collapse';

export default function CryptoOnrampScreen() {
  const {
    hasLinkAccount,
    authenticateUser,
    verifyIdentity,
    attachKycInfo,
    collectPaymentMethod,
    provideCheckoutClientSecret,
    createCryptoPaymentToken,
    performCheckout,
    authorize,
  } = useOnramp();
  const { isPlatformPaySupported } = useStripe();
  const [email, setEmail] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkAuthIntentId, setLinkAuthIntentId] = useState('');

  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [platformPayPaymentMethod] = useState('PlatformPay');
  const [cardPaymentMethod] = useState('Card');
  const [bankAccountPaymentMethod] = useState('BankAccount');

  const [paymentDisplayData, setPaymentDisplayData] =
    useState<PaymentOptionData | null>(null);

  const [cryptoPaymentToken, setCryptoPaymentToken] = useState<string | null>(
    null
  );

  const [isApplePaySupported, setIsApplePaySupported] = useState(false);

  type CheckoutClientSecretRequestedParams = {
    onrampSessionId: string;
  };

  useEffect(() => {
    const subscription = addListener(
      'onCheckoutClientSecretRequested',
      async (params: CheckoutClientSecretRequestedParams) => {
        console.log(params.onrampSessionId);

        const clientSecret = 'INSERT_CLIENT_SECRET_HERE';
        provideCheckoutClientSecret(clientSecret);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [provideCheckoutClientSecret]);

  const checkIsLinkUser = useCallback(async () => {
    setResponse(null);
    const result = await hasLinkAccount(email);

    if (result?.error) {
      setResponse(
        `Error: ${result.error.message || 'An error occurred while checking link user.'}`
      );
    } else {
      setIsLinkUser(result.hasLinkAccount);
      setResponse(`Is Link User: ${result.hasLinkAccount}`);
    }
  }, [email, hasLinkAccount]);

  const handlePresentVerification = useCallback(async () => {
    const result = await authenticateUser();

    if (result?.error) {
      Alert.alert('Error', `Authentication Failed: ${result.error.message}.`);
    } else if (result?.customerId) {
      setCustomerId(result.customerId);
    } else {
      Alert.alert('Cancelled', 'Authentication cancelled, please try again.');
    }
  }, [authenticateUser]);

  const handleAuthorizeLinkAuthIntent = useCallback(async () => {
    const result = await authorize(linkAuthIntentId);

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not authorize Link auth intent ${result.error.message}.`
      );
    } else if (result?.status) {
      Alert.alert(
        'Success',
        `Link auth intent ${result.status.toLowerCase()}.`
      );
    } else {
      Alert.alert('Cancelled', 'Link auth intent authorization was cancelled.');
    }
  }, [authorize, linkAuthIntentId]);

  const handleVerifyIdentity = useCallback(async () => {
    const result = await verifyIdentity();

    if (result?.error) {
      if (result.error.code === 'Canceled') {
        Alert.alert(
          'Canceled',
          'Identity Verification canceled, please try again.'
        );
      } else {
        Alert.alert(
          'Error',
          `Could not verify identity ${result.error.message}.`
        );
      }
    } else {
      Alert.alert('Success', 'Identity Verification completed');
    }
  }, [verifyIdentity]);

  const handleCollectApplePayPayment = useCallback(async () => {
    const platformPayParams = {
      applePay: {
        cartItems: [
          {
            label: 'Example',
            amount: '1.00',
            paymentType: PlatformPay.PaymentType.Immediate,
          },
        ],
        merchantCountryCode: 'US',
        currencyCode: 'USD',
      },
    };

    const result = await collectPaymentMethod(
      platformPayPaymentMethod,
      platformPayParams
    );

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not collect payment ${result.error.message}.`
      );
    } else if (result?.displayData) {
      setPaymentDisplayData(result.displayData);
    } else {
      Alert.alert(
        'Cancelled',
        'Payment collection cancelled, please try again.'
      );
    }
  }, [platformPayPaymentMethod, collectPaymentMethod]);

  const handleAttachKycInfo = useCallback(async () => {
    const kycInfo = {
      firstName: firstName,
      lastName: lastName,
      idNumber: '000000000',
      dateOfBirth: {
        day: 1,
        month: 1,
        year: 1990,
      },
      address: {
        line1: '123 Main St',
        line2: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94111',
        country: 'US',
      },
      nationalities: ['US'],
      birthCountry: 'US',
      birthCity: 'San Francisco',
    };

    const result = await attachKycInfo(kycInfo);

    if (result?.error) {
      Alert.alert(
        'Error',
        `Failed to attach KYC info: ${result.error.message}.`
      );
    } else {
      Alert.alert('Success', 'KYC Attached');
    }
  }, [attachKycInfo, firstName, lastName]);

  const handleCollectCardPayment = useCallback(async () => {
    const result = await collectPaymentMethod(cardPaymentMethod, {});

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not collect payment ${result.error.message}.`
      );
    } else if (result?.displayData) {
      setPaymentDisplayData(result.displayData);
    } else {
      Alert.alert(
        'Cancelled',
        'Payment collection cancelled, please try again.'
      );
    }
  }, [cardPaymentMethod, collectPaymentMethod]);

  const handleCollectBankAccountPayment = useCallback(async () => {
    const result = await collectPaymentMethod(bankAccountPaymentMethod, {});

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not collect payment ${result.error.message}.`
      );
    } else if (result?.displayData) {
      setPaymentDisplayData(result.displayData);
    } else {
      Alert.alert(
        'Cancelled',
        'Payment collection cancelled, please try again.'
      );
    }
  }, [bankAccountPaymentMethod, collectPaymentMethod]);

  const handleCreateCryptoPaymentToken = useCallback(async () => {
    const result = await createCryptoPaymentToken();

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not create crypto payment token ${result.error.message}.`
      );
    } else {
      setCryptoPaymentToken(result.cryptoPaymentToken);
    }
  }, [createCryptoPaymentToken]);

  const handlePerformCheckout = useCallback(async () => {
    const result = await performCheckout('INSERT_SESSION_ID_HERE');

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not perform checkout ${result.error.message}.`
      );
    } else if (result) {
      Alert.alert('Success', 'Checkout succeeded!');
    } else {
      Alert.alert('Cancelled', 'Checkout cancelled.');
    }
  }, [performCheckout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS === 'ios') {
        try {
          const supported = await isPlatformPaySupported();
          if (mounted) setIsApplePaySupported(!!supported);
        } catch {
          if (mounted) setIsApplePaySupported(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isPlatformPaySupported]);

  return (
    <ScrollView accessibilityLabel="onramp-flow" style={styles.container}>
      <Collapse title="User Information" initialExpanded={true}>
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

        {isLinkUser === false && (
          <Button
            title="Verify Link User"
            onPress={checkIsLinkUser}
            variant="primary"
          />
        )}
      </Collapse>

      {response && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText}>{response}</Text>
        </View>
      )}

      {customerId && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText}>
            {'Customer ID: ' + customerId}
          </Text>
        </View>
      )}

      {paymentDisplayData && (
        <View style={styles.buttonContainer}>
          <Image
            source={{ uri: paymentDisplayData.icon }}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text style={styles.responseText}>
            {'Payment Method Label: ' + paymentDisplayData.label}
          </Text>
          <Text style={styles.responseText}>
            {'Payment Method Sublabel: ' + paymentDisplayData.sublabel}
          </Text>
        </View>
      )}

      {cryptoPaymentToken && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {'Crypto Payment Token: ' + cryptoPaymentToken}
          </Text>
        </View>
      )}

      {isLinkUser === true && customerId === null && (
        <Collapse title="Link Authentication" initialExpanded={true}>
          <TextInput
            style={styles.textInput}
            placeholder="Link auth intent id"
            value={linkAuthIntentId}
            onChangeText={setLinkAuthIntentId}
            keyboardType="default"
            autoCapitalize="none"
          />
          <Button
            title="Authenticate Link User"
            onPress={handlePresentVerification}
            variant="primary"
          />
          <Button
            title="Authorize Link Auth Intent"
            onPress={handleAuthorizeLinkAuthIntent}
            variant="primary"
          />
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="KYC Information" initialExpanded={true}>
          <TextInput
            style={styles.textInput}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            keyboardType="default"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.textInput}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            keyboardType="default"
            autoCapitalize="none"
          />
          <Button
            title="Attach KYC Info"
            onPress={handleAttachKycInfo}
            variant="primary"
          />
          <Button
            title="Verify Identity"
            onPress={handleVerifyIdentity}
            variant="primary"
          />
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="Payment Collection" initialExpanded={true}>
          {Platform.OS === 'ios' && isApplePaySupported && (
            <View style={styles.applePayButtonContainer}>
              <PlatformPayButton
                onPress={handleCollectApplePayPayment}
                style={styles.applePayButton}
              />
            </View>
          )}
          <Button
            title="Collect Card Payment"
            onPress={handleCollectCardPayment}
            variant="primary"
          />
          <Button
            title="Collect Bank Account Payment"
            onPress={handleCollectBankAccountPayment}
            variant="primary"
          />
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="Crypto Operations" initialExpanded={true}>
          {(cardPaymentMethod != null || bankAccountPaymentMethod != null) && (
            <Button
              title="Create Crypto Payment Token"
              onPress={handleCreateCryptoPaymentToken}
              variant="primary"
            />
          )}
          <Button
            title="Check Out"
            onPress={handlePerformCheckout}
            variant="primary"
          />
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="Wallet Registration" initialExpanded={true}>
          <RegisterWalletAddressScreen />
        </Collapse>
      )}
    </ScrollView>
  );
}

export function RegisterWalletAddressScreen() {
  const { registerWalletAddress } = useOnramp();
  const [walletAddress, setWalletAddress] = useState(
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  );
  const [network, setNetwork] = useState<CryptoNetwork>(CryptoNetwork.ethereum);
  const [response, setResponse] = useState<string | null>(null);

  const handleRegisterWallet = useCallback(async () => {
    setResponse(null);
    const result = await registerWalletAddress(walletAddress, network);

    if (result?.error) {
      setResponse(
        `Error: ${result.error.message || 'Failed to register wallet.'}`
      );
      Alert.alert(
        'Error',
        result.error.message || 'Failed to register wallet.'
      );
    } else {
      setResponse(`Wallet registered`);
    }
  }, [walletAddress, network, registerWalletAddress]);

  return (
    <View style={styles.walletContainer}>
      <Text style={styles.infoText}>Wallet Address:</Text>
      <TextInput
        value={walletAddress}
        onChangeText={setWalletAddress}
        placeholder="Enter wallet address"
        style={styles.textInput}
      />
      <Text style={styles.infoText}>Network:</Text>
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
      <Text style={styles.infoText}>Selected Network: {String(network)}</Text>
      <Button
        title="Register Wallet Address"
        onPress={handleRegisterWallet}
        variant="primary"
      />
      {response && <Text style={styles.responseText}>{response}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingEnd: 16, // Hack.
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoContainer: {
    paddingVertical: 16,
    gap: 4,
  },
  infoText: {},
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
  applePayButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applePayButton: {
    height: 50,
  },
  walletContainer: {
    paddingVertical: 16,
    gap: 4,
  },
});
