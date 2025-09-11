import {
  Onramp,
  PaymentOptionData,
  PlatformPay,
  useOnramp,
  useStripe,
} from '@stripe/stripe-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Button from '../../components/Button';
import { FormField } from './FormField';
import { Collapse } from '../../components/Collapse';
import {
  createAuthIntent,
  createOnrampSession,
  checkout,
} from '../../../server/onrampBackend';
import { getDestinationParamsForNetwork } from './utils';

import type { StripeError } from '@stripe/stripe-react-native/src/types';
import type { OnrampError } from '@stripe/stripe-react-native/src/types/Errors';

import {
  AttachKycInfoSection,
  VerifyIdentitySection,
  PhoneNumberUpdateSection,
  LinkAuthenticationSection,
  PaymentCollectionSection,
  CryptoOperationsSection,
  OnrampSessionCreationSection,
  RegisterWalletAddressSection,
} from './sections';
import { colors } from '../../colors';

export default function CryptoOnrampFlow() {
  const {
    hasLinkAccount,
    verifyIdentity,
    attachKycInfo,
    updatePhoneNumber,
    collectPaymentMethod,
    createCryptoPaymentToken,
    performCheckout,
    authorize,
    logOut,
    isAuthError,
  } = useOnramp();
  const { isPlatformPaySupported } = useStripe();
  const [userInfo, setUserInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
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
  const [walletNetwork, setWalletNetwork] =
    useState<Onramp.CryptoNetwork | null>(null);

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
    const result = await hasLinkAccount(userInfo.email);

    if (result?.error) {
      setResponse(
        `Error: ${result.error.message || 'An error occurred while checking link user.'}`
      );
    } else {
      setIsLinkUser(result.hasLinkAccount);
      setResponse(`Is Link User: ${result.hasLinkAccount}`);
    }
  }, [userInfo.email, hasLinkAccount]);

  const handlePresentVerification = useCallback(async () => {
    if (!userInfo.email) {
      Alert.alert('Error', 'Please enter an email address first.');
      return;
    }

    try {
      // Step 1: Create auth intent using OnrampBackend API
      const authIntentResponse = await createAuthIntent(
        userInfo.email,
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
  }, [userInfo.email, authorize]);

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
          `Could not authorize Link auth intent: ${result.error.message}.`
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
        `Could not collect payment: ${result.error.message}.`
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
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
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
        `Failed to attach KYC info: ${result.error.message}.`
      );
    } else {
      Alert.alert('Success', 'KYC Attached');
    }
  }, [
    attachKycInfo,
    userInfo.firstName,
    userInfo.lastName,
    withReauth,
    authorize,
    linkAuthIntentId,
  ]);

  const handleUpdatePhoneNumber = useCallback(async () => {
    if (!userInfo.phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number first.');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(userInfo.phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number in E.164 format (e.g., +12125551234)'
      );
      return;
    }

    // Note: This is called before authentication, so no withReauth needed
    const result = await updatePhoneNumber(userInfo.phoneNumber);

    if (result?.error) {
      Alert.alert(
        'Error',
        `Failed to update phone number: ${result.error.message}.`
      );
    } else {
      Alert.alert('Success', 'Phone number updated successfully!');
    }
  }, [userInfo.phoneNumber, updatePhoneNumber]);

  const handleCollectCardPayment = useCallback(async () => {
    const result = await withReauth(
      () => collectPaymentMethod('Card'),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      Alert.alert(
        'Error',
        `Could not collect payment: ${result.error.message}.`
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
    if (!walletAddress || !walletNetwork)
      missingItems.push('wallet address registration');
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
    walletNetwork,
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
        `Could not collect payment: ${result.error.message}.`
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
        `Could not create crypto payment token: ${result.error.message}.`
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
      // Get the correct destination network and currency based on wallet network
      const destinationParams = getDestinationParamsForNetwork(walletNetwork!);

      const result = await createOnrampSession(
        cryptoPaymentToken!,
        walletAddress!,
        customerId!,
        authToken!,
        destinationParams.destinationNetwork,
        10.0, // sourceAmount
        'usd', // sourceCurrency
        destinationParams.destinationCurrency,
        '127.0.0.1' // customerIpAddress
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
    walletNetwork,
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
          `Could not perform checkout: ${result.error.message}.`
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

  const handleLogOut = useCallback(async () => {
    const result = await logOut();

    if (result?.error) {
      Alert.alert('Error', `Could not log out: ${result.error.message}.`);
    } else {
      Alert.alert('Success', 'Logged out successfully!');
      // Reset all state to initial values
      setUserInfo({ email: '', firstName: '', lastName: '', phoneNumber: '' });
      setLinkAuthIntentId('');
      setResponse(null);
      setIsLinkUser(false);
      setCustomerId(null);
      setPaymentDisplayData(null);
      setCryptoPaymentToken(null);
      setAuthToken(null);
      setWalletAddress(null);
      setWalletNetwork(null);
      setOnrampSessionId(null);
    }
  }, [logOut]);

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
        <FormField
          label="Email"
          value={userInfo.email}
          onChangeText={(text) => setUserInfo((u) => ({ ...u, email: text }))}
          placeholder="Email"
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

      {walletAddress && walletNetwork && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {'Wallet Address: ' + walletAddress}
          </Text>
          <Text style={styles.responseText}>{'Network: ' + walletNetwork}</Text>
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
        <>
          <PhoneNumberUpdateSection
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            handleUpdatePhoneNumber={handleUpdatePhoneNumber}
          />
          <LinkAuthenticationSection
            linkAuthIntentId={linkAuthIntentId}
            setLinkAuthIntentId={setLinkAuthIntentId}
            handlePresentVerification={handlePresentVerification}
            handleAuthorizeLinkAuthIntent={handleAuthorizeLinkAuthIntent}
          />
        </>
      )}

      {isLinkUser === true && customerId != null && (
        <>
          <AttachKycInfoSection
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            handleAttachKycInfo={handleAttachKycInfo}
          />
          <VerifyIdentitySection handleVerifyIdentity={handleVerifyIdentity} />
          <PaymentCollectionSection
            isApplePaySupported={isApplePaySupported}
            handleCollectApplePayPayment={handleCollectApplePayPayment}
            handleCollectCardPayment={handleCollectCardPayment}
            handleCollectBankAccountPayment={handleCollectBankAccountPayment}
          />
          <CryptoOperationsSection
            cardPaymentMethod={cardPaymentMethod}
            bankAccountPaymentMethod={bankAccountPaymentMethod}
            handleCreateCryptoPaymentToken={handleCreateCryptoPaymentToken}
          />
          <RegisterWalletAddressSection
            onWalletRegistered={(address, network) => {
              setWalletAddress(address);
              setWalletNetwork(network);
            }}
          />
          <OnrampSessionCreationSection
            isCreatingSession={isCreatingSession}
            isCheckingOut={isCheckingOut}
            onrampSessionId={onrampSessionId}
            handleCreateOnrampSession={handleCreateOnrampSession}
            handlePerformCheckout={handlePerformCheckout}
            validateOnrampSessionParams={validateOnrampSessionParams}
          />
        </>
      )}

      {customerId && (
        <View style={styles.logoutContainer}>
          <Button title="Log Out" onPress={handleLogOut} variant="primary" />
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
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
  logoutContainer: {
    paddingStart: 16,
    paddingVertical: 16,
  },
});
