import { Picker } from '@react-native-picker/picker';
import {
  Onramp,
  PaymentOptionData,
  PlatformPay,
  PlatformPayButton,
  useOnramp,
  useStripe,
} from '@stripe/stripe-react-native';
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
import {
  createAuthIntent,
  createOnrampSession,
  checkout,
} from '../../server/onrampBackend';

import type { StripeError } from '@stripe/stripe-react-native/src/types';
import type { OnrampError } from '@stripe/stripe-react-native/src/types/Errors';

export default function CryptoOnrampScreen() {
  const {
    hasLinkAccount,
    verifyIdentity,
    attachKycInfo,
    collectPaymentMethod,
    createCryptoPaymentToken,
    performCheckout,
    authorize,
    isAuthError,
  } = useOnramp();
  const { isPlatformPaySupported } = useStripe();
  const [email, setEmail] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkAuthIntentId, setLinkAuthIntentId] = useState('');

  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [cardPaymentMethod] = useState('Card');
  const [bankAccountPaymentMethod] = useState('BankAccount');

  const [paymentDisplayData, setPaymentDisplayData] =
    useState<PaymentOptionData | null>(null);

  const [cryptoPaymentToken, setCryptoPaymentToken] = useState<string | null>(
    null
  );

  const [isApplePaySupported, setIsApplePaySupported] = useState(false);

  // Auth token from CreateAuthIntentResponse
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Wallet address from registration
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Onramp session data
  const [onrampSessionId, setOnrampSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Helper function to handle authentication errors with automatic retry
  const withReauth = useCallback(
    async <T extends { error?: StripeError<OnrampError> }>(
      f: () => Promise<T>,
      reauth: () => Promise<{ error?: StripeError<OnrampError> }>
    ): Promise<T> => {
      const result = await f();
      if (isAuthError(result.error)) {
        const reauthResult = await reauth();
        if (reauthResult.error) {
          Alert.alert(
            'Error reauthenticating',
            `${JSON.stringify(reauthResult.error, null, 2)}`
          );
          return result;
        }
        return await f();
      }
      return result;
    },
    [isAuthError]
  );

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
    if (!email) {
      Alert.alert('Error', 'Please enter an email address first.');
      return;
    }

    try {
      // Step 1: Create auth intent using OnrampBackend API
      const authIntentResponse = await createAuthIntent(
        email,
        'kyc.status:read,crypto:ramp'
      );

      if (!authIntentResponse.success) {
        Alert.alert(
          'Error Creating Auth Intent',
          `Code: ${authIntentResponse.error.code}\nMessage: ${authIntentResponse.error.message}`
        );
        return;
      }

      const authIntentId = authIntentResponse.data.data.id;
      console.log(`Created auth intent: ${authIntentId}`);

      // Step 2: Authorize using the created auth intent ID
      const result = await authorize(authIntentId);

      if (result?.error) {
        Alert.alert('Error', `Authentication Failed: ${result.error.message}.`);
      } else if (result?.status === 'Consented' && result.customerId) {
        Alert.alert('Success', `Authentication successful!`);
        setCustomerId(result.customerId);
        setLinkAuthIntentId(authIntentId);
        setAuthToken(authIntentResponse.data.token);
      } else if (result?.status === 'Denied') {
        Alert.alert(
          'Access Denied',
          'User denied the authentication request. Please try again.'
        );
      } else {
        Alert.alert('Cancelled', 'Authentication cancelled, please try again.');
      }
    } catch (error) {
      console.error('Error in authentication flow:', error);
      Alert.alert('Error', 'Failed to complete authentication flow.');
    }
  }, [email, authorize]);

  const handleAuthorizeLinkAuthIntent = useCallback(async () => {
    const result = await authorize(linkAuthIntentId);

    if (result?.error) {
      if (result.error.code === 'Canceled') {
        Alert.alert(
          'Cancelled',
          'Link auth intent authorization was cancelled.'
        );
      } else {
        Alert.alert(
          'Error',
          `Could not authorize Link auth intent ${result.error.message}.`
        );
      }
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
    const result = await withReauth(
      () => verifyIdentity(),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      if (result.error.code === 'Canceled') {
        Alert.alert(
          'Canceled',
          'Identity Verification canceled, please try again.'
        );
      } else {
        Alert.alert(
          'Error',
          `Could not verify identity: ${JSON.stringify(result.error, null, 2)}`
        );
      }
    } else {
      Alert.alert('Success', 'Identity Verification completed');
    }
  }, [verifyIdentity, withReauth, authorize, linkAuthIntentId]);

  const handleCollectApplePayPayment = useCallback(async () => {
    const platformPayParams: PlatformPay.PaymentMethodParams = {
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

    const result = await collectPaymentMethod('PlatformPay', platformPayParams);

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
  }, [collectPaymentMethod]);

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
    };

    const result = await withReauth(
      () => attachKycInfo(kycInfo),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      Alert.alert(
        'Error',
        `Failed to attach KYC info: ${result.error?.stripeErrorCode} ${result.error.message}.`
      );
    } else {
      Alert.alert('Success', 'KYC Attached');
    }
  }, [
    attachKycInfo,
    firstName,
    lastName,
    withReauth,
    authorize,
    linkAuthIntentId,
  ]);

  const handleCollectCardPayment = useCallback(async () => {
    const result = await withReauth(
      () => collectPaymentMethod('Card'),
      () => authorize(linkAuthIntentId)
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
  }, [collectPaymentMethod, withReauth, authorize, linkAuthIntentId]);

  const validateOnrampSessionParams = useCallback((): {
    isValid: boolean;
    message?: string;
  } => {
    const missingItems: string[] = [];

    if (!customerId) missingItems.push('customer authentication');
    if (!walletAddress) missingItems.push('wallet address registration');
    if (!paymentDisplayData) missingItems.push('payment method selection');
    if (!cryptoPaymentToken) missingItems.push('crypto payment token creation');
    if (!authToken) missingItems.push('authentication token');

    if (missingItems.length === 0) {
      return { isValid: true };
    }

    let message = `Please complete the following steps first: ${missingItems.join(', ')}`;
    return { isValid: false, message };
  }, [
    customerId,
    walletAddress,
    paymentDisplayData,
    cryptoPaymentToken,
    authToken,
  ]);

  const handleCollectBankAccountPayment = useCallback(async () => {
    const result = await withReauth(
      () => collectPaymentMethod('BankAccount'),
      () => authorize(linkAuthIntentId)
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
  }, [collectPaymentMethod, withReauth, authorize, linkAuthIntentId]);

  const handleCreateCryptoPaymentToken = useCallback(async () => {
    const result = await withReauth(
      () => createCryptoPaymentToken(),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not create crypto payment token ${result.error.message}.`
      );
    } else {
      setCryptoPaymentToken(result.cryptoPaymentToken);
    }
  }, [createCryptoPaymentToken, withReauth, authorize, linkAuthIntentId]);

  const handleCreateOnrampSession = useCallback(async () => {
    const validation = validateOnrampSessionParams();
    if (!validation.isValid) {
      Alert.alert('Missing Requirements', validation.message!);
      return;
    }

    setIsCreatingSession(true);

    try {
      const result = await createOnrampSession(
        cryptoPaymentToken!,
        walletAddress!,
        customerId!,
        authToken!
      );

      if (result.success) {
        // Cache the session ID for checkout
        setOnrampSessionId(result.data.id);

        Alert.alert(
          'Onramp Session Created',
          `Session ID: ${result.data.id}\nClient Secret: ${result.data.client_secret.substring(0, 20)}...`
        );
      } else {
        Alert.alert(
          'Error Creating Onramp Session',
          `Code: ${result.error.code}\nMessage: ${result.error.message}`
        );
      }
    } catch (error) {
      console.error('Error creating onramp session:', error);
      Alert.alert('Error', 'Failed to create onramp session.');
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    validateOnrampSessionParams,
    cryptoPaymentToken,
    walletAddress,
    customerId,
    authToken,
  ]);

  const handlePerformCheckout = useCallback(async () => {
    if (!onrampSessionId) {
      Alert.alert('Error', 'Please create an onramp session first.');
      return;
    }

    setIsCheckingOut(true);

    try {
      const result = await performCheckout(onrampSessionId, async () => {
        if (!authToken) {
          throw new Error('Auth token is required for checkout');
        }

        const checkoutResult = await checkout(onrampSessionId, authToken);

        if (checkoutResult.success) {
          return checkoutResult.data.client_secret;
        } else {
          throw new Error(`Checkout failed: ${checkoutResult.error.message}`);
        }
      });

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
    } catch (error) {
      console.error('Error during checkout:', error);
      Alert.alert('Error', 'Failed to complete checkout.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [performCheckout, onrampSessionId, authToken]);

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

      {authToken && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {'Auth Token: ' + authToken.substring(0, 20) + '...'}
          </Text>
        </View>
      )}

      {walletAddress && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {'Wallet Address: ' + walletAddress}
          </Text>
        </View>
      )}

      {onrampSessionId && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {'Onramp Session ID: ' + onrampSessionId}
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
            title="Create Auth Intent & Authenticate"
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
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="Wallet Registration" initialExpanded={true}>
          <RegisterWalletAddressScreen onWalletRegistered={setWalletAddress} />
        </Collapse>
      )}

      {isLinkUser === true && customerId != null && (
        <Collapse title="Onramp Session Creation" initialExpanded={true}>
          <Button
            title={
              isCreatingSession
                ? 'Creating Session...'
                : 'Create Onramp Session'
            }
            onPress={handleCreateOnrampSession}
            variant="primary"
            disabled={
              !validateOnrampSessionParams().isValid || isCreatingSession
            }
          />
          {!validateOnrampSessionParams().isValid && !isCreatingSession && (
            <Text style={styles.infoText}>
              {validateOnrampSessionParams().message}
            </Text>
          )}
          {isCreatingSession && (
            <Text style={styles.infoText}>Creating onramp session...</Text>
          )}
          <Button
            title={isCheckingOut ? 'Checking Out...' : 'Check Out'}
            onPress={handlePerformCheckout}
            variant="primary"
            disabled={!onrampSessionId || isCheckingOut}
          />
          {!onrampSessionId && !isCheckingOut && (
            <Text style={styles.infoText}>
              Please create an onramp session first
            </Text>
          )}
          {isCheckingOut && (
            <Text style={styles.infoText}>Processing checkout...</Text>
          )}
        </Collapse>
      )}
    </ScrollView>
  );
}

export function RegisterWalletAddressScreen({
  onWalletRegistered,
}: {
  onWalletRegistered?: (address: string) => void;
}) {
  const { registerWalletAddress } = useOnramp();
  const [walletAddress, setWalletAddress] = useState(
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  );
  const [network, setNetwork] = useState<Onramp.CryptoNetwork>(
    Onramp.CryptoNetwork.ethereum
  );
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
      onWalletRegistered?.(walletAddress);
    }
  }, [walletAddress, network, registerWalletAddress, onWalletRegistered]);

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
        onValueChange={(itemValue) =>
          setNetwork(itemValue as Onramp.CryptoNetwork)
        }
        style={styles.textInput}
      >
        {Object.values(Onramp.CryptoNetwork).map((n) => (
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
