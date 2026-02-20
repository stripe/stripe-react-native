import {
  Onramp,
  PaymentOptionData,
  PlatformPay,
  useOnramp,
  useStripe,
} from '@stripe/stripe-react-native';
import type { Address } from '@stripe/stripe-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
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
  signup,
  login,
  saveUser,
  createLinkAuthToken,
  getCryptoCustomerId,
} from '../../api/onrampBackend';
import {
  getDestinationParamsForNetwork,
  showError,
  showSuccess,
  showCanceled,
} from './utils';

import type { StripeError } from '@stripe/stripe-react-native/src/types';
import type { OnrampError } from '@stripe/stripe-react-native/src/types/Errors';

import {
  AttachKycInfoSection,
  KycRefreshSection,
  VerifyIdentitySection,
  PhoneNumberUpdateSection,
  LinkAuthenticationSection,
  PaymentCollectionSection,
  CryptoOperationsSection,
  OnrampSessionCreationSection,
  RegisterWalletAddressSection,
  OnrampResponseStatusSection,
} from './sections';
import { colors } from '../../colors';

export default function CryptoOnrampFlow() {
  const {
    hasLinkAccount,
    verifyIdentity,
    attachKycInfo,
    presentKycInfoVerification,
    updatePhoneNumber,
    collectPaymentMethod,
    createCryptoPaymentToken,
    performCheckout,
    authorize,
    getCryptoTokenDisplayData,
    logOut,
    isAuthError,
    authenticateUserWithToken,
  } = useOnramp();
  const { isPlatformPaySupported } = useStripe();
  const [userInfo, setUserInfo] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [linkAuthIntentId, setLinkAuthIntentId] = useState('');

  // Seamless sign-in persistence
  const STORAGE_KEY_DEMO_AUTH = 'demoAuthCredentials';
  const [storedDemoAuth, setStoredDemoAuth] = useState<{
    email: string;
    token: string;
  } | null>(null);
  const [isSeamlessSigningIn, setIsSeamlessSigningIn] = useState(false);

  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [cardPaymentMethod] = useState('Card');
  const [bankAccountPaymentMethod] = useState('BankAccount');

  const [currentPaymentDisplayData, setCurrentPaymentDisplayData] =
    useState<PaymentOptionData | null>(null);

  const [cryptoPaymentToken, setCryptoPaymentToken] = useState<string | null>(
    null
  );

  const [isApplePaySupported, setIsApplePaySupported] = useState(false);
  const [authInProgress, setAuthInProgress] = useState<
    null | 'login' | 'signup'
  >(null);

  // Payment method state used to help determine ACH settlement speed segmented control visibility (only available for bank account payments).
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'Card' | 'BankAccount' | 'PlatformPay' | null
  >(null);

  // ACH settlement speed state
  const [achSettlementSpeed, setAchSettlementSpeed] = useState<
    'instant' | 'standard'
  >('instant');

  // KYC Refresh state
  const [needsKycAddressUpdate, setNeedsKycAddressUpdate] = useState(false);
  const [kycUpdatedAddress, setKycUpdatedAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  // Auth token from SignupResponse, LoginResponse, or CreateAuthIntentResponse
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
          showError(
            `Error reauthenticating: ${JSON.stringify(reauthResult.error, null, 2)}`
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
      if (!result.hasLinkAccount) {
        Alert.alert(
          'Link account not found',
          "Return to the Home Screen and choose 'Register Crypto Link User' to complete registration before returning here to sign in."
        );
      }
    }
  }, [userInfo.email, hasLinkAccount]);

  const handleLogin = useCallback(async () => {
    if (!userInfo.email || !userInfo.password) {
      showError('Please enter both email and password.');
      return;
    }
    setAuthInProgress('login');
    try {
      const res = await login(userInfo.email, userInfo.password);
      if (res.success) {
        setAuthToken(res.data.token);
      } else {
        showError(`${res.error.code}: ${res.error.message}`);
      }
    } finally {
      setAuthInProgress(null);
    }
  }, [userInfo.email, userInfo.password]);

  const handleSignup = useCallback(async () => {
    if (!userInfo.email || !userInfo.password) {
      showError('Please enter both email and password.');
      return;
    }
    setAuthInProgress('signup');
    try {
      const res = await signup(userInfo.email, userInfo.password);
      if (res.success) {
        setAuthToken(res.data.token);
      } else {
        showError(`${res.error.code}: ${res.error.message}`);
      }
    } finally {
      setAuthInProgress(null);
    }
  }, [userInfo.email, userInfo.password]);

  const showPaymentData = useCallback(async () => {
    const cardParams: Onramp.CryptoPaymentToken = {
      card: {
        brand: 'visa',
        funding: 'credit',
        last4: '1234',
      },
    };

    const bankParams: Onramp.CryptoPaymentToken = {
      us_bank_account: {
        bank_name: 'Bank of America',
        last4: '5678',
      },
    };

    const cardData = (await getCryptoTokenDisplayData(cardParams)).displayData;
    const bankData = (await getCryptoTokenDisplayData(bankParams)).displayData;

    if (cardData) {
      setCurrentPaymentDisplayData(cardData);
      console.log('Bank Payment Data:', bankData);
    } else {
      Alert.alert('No Payment Data', 'No payment data available to display.');
    }
  }, [getCryptoTokenDisplayData]);

  const handlePresentVerification = useCallback(async () => {
    if (!authToken) {
      showError('Please log in to the demo backend first.');
      return;
    }

    try {
      // Step 1: Create auth intent using OnrampBackend API
      const authIntentResponse = await createAuthIntent(
        authToken,
        'kyc.status:read,crypto:ramp,auth.persist_login:read'
      );

      if (!authIntentResponse.success) {
        showError(
          `Code: ${authIntentResponse.error.code}\nMessage: ${authIntentResponse.error.message}`
        );
        return;
      }

      // Overwrite stored auth token with the latest token from the response
      const newToken = authIntentResponse.data.token;
      if (newToken) {
        setAuthToken(newToken);
        // Persist for seamless sign-in (email + token)
        try {
          await AsyncStorage.setItem(
            STORAGE_KEY_DEMO_AUTH,
            JSON.stringify({ email: userInfo.email, token: newToken })
          );
          setStoredDemoAuth({ email: userInfo.email, token: newToken });
        } catch {}
      }
      const latestAuthToken = newToken ?? authToken;

      const authIntentId = authIntentResponse.data.authIntentId;

      // Step 2: Authorize using the created auth intent ID
      const result = await authorize(authIntentId);

      if (result?.error) {
        showError(`Authentication Failed: ${result.error.message}.`);
      } else if (result?.status === 'Consented' && result.customerId) {
        showSuccess(`Authentication successful!`);
        setCustomerId(result.customerId);
        setLinkAuthIntentId(authIntentId);

        // Persist user to demo backend with their crypto customer id
        const saveUserRes = await saveUser(result.customerId, latestAuthToken);
        if (!saveUserRes.success) {
          showError(
            `Failed to save user: ${saveUserRes.error.code} - ${saveUserRes.error.message}`
          );
        }
      } else if (result?.status === 'Denied') {
        showError('User denied the authentication request. Please try again.');
      } else {
        showCanceled('Authentication cancelled, please try again.');
      }
    } catch (error) {
      console.error('Error in authentication flow:', error);
      showError('Failed to complete authentication flow.');
    }
  }, [authToken, authorize, userInfo.email]);

  const handleVerifyIdentity = useCallback(async () => {
    const result = await withReauth(
      () => verifyIdentity(),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      if (result.error.code === 'Canceled') {
        showCanceled('Identity Verification canceled, please try again.');
      } else {
        showError(
          `Could not verify identity: ${JSON.stringify(result.error, null, 2)}`
        );
      }
    } else {
      showSuccess('Identity Verification completed');
    }
  }, [verifyIdentity, withReauth, authorize, linkAuthIntentId]);

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
      showError(`Failed to attach KYC info: ${result.error.message}.`);
    } else {
      showSuccess('KYC Attached');
    }
  }, [
    attachKycInfo,
    userInfo.firstName,
    userInfo.lastName,
    withReauth,
    authorize,
    linkAuthIntentId,
  ]);

  const handlePresentKycVerification = useCallback(
    async (updatedAddress: Address | null) => {
      const result = await withReauth(
        () => presentKycInfoVerification(updatedAddress),
        () => authorize(linkAuthIntentId)
      );

      if (result?.error) {
        if (result.error.code === 'Canceled') {
          showCanceled('KYC verification cancelled, please try again.');
        } else {
          showError(
            `Could not verify KYC info: ${JSON.stringify(result.error, null, 2)}`
          );
        }
      } else if (result?.status === 'Confirmed') {
        setNeedsKycAddressUpdate(false);
        showSuccess('KYC information verified.');
      } else if (result?.status === 'UpdateAddress') {
        // Show form to collect updated address
        setNeedsKycAddressUpdate(true);
      } else {
        showCanceled('KYC verification cancelled.');
      }
    },
    [presentKycInfoVerification, withReauth, authorize, linkAuthIntentId]
  );

  const handleUpdatePhoneNumber = useCallback(async () => {
    if (!userInfo.phoneNumber) {
      showError('Please enter a phone number first.');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(userInfo.phoneNumber)) {
      showError(
        'Please enter a valid phone number in E.164 format (e.g., +12125551234)'
      );
      return;
    }

    // Note: This is called before authentication, so no withReauth needed
    const result = await updatePhoneNumber(userInfo.phoneNumber);

    if (result?.error) {
      showError(`Failed to update phone number: ${result.error.message}.`);
    } else {
      showSuccess('Phone number updated successfully!');
    }
  }, [userInfo.phoneNumber, updatePhoneNumber]);

  type CollectPaymentRequest =
    | { type: 'Card' }
    | { type: 'BankAccount' }
    | { type: 'PlatformPay'; params: PlatformPay.PaymentMethodParams };

  const handleCollectPaymentMethod = useCallback(
    async (request: CollectPaymentRequest) => {
      const result = await withReauth(
        () =>
          request.type === 'PlatformPay'
            ? collectPaymentMethod(request.type, request.params)
            : collectPaymentMethod(request.type),
        () => authorize(linkAuthIntentId)
      );

      if (result?.error) {
        showError(`Could not collect payment: ${result.error.message}.`);
      } else if (result?.displayData) {
        setCurrentPaymentDisplayData(result.displayData);

        // Track which payment type was actually selected (controls ACH segmented control visibility).
        setSelectedPaymentMethod(request.type);

        // If switching away from bank account, ensure UI will default to instant.
        if (request.type !== 'BankAccount') {
          setAchSettlementSpeed('instant');
        }
      } else {
        showCanceled('Payment collection cancelled, please try again.');
      }
    },
    [collectPaymentMethod, withReauth, authorize, linkAuthIntentId]
  );

  const handleCollectCardPayment = useCallback(async () => {
    handleCollectPaymentMethod({ type: 'Card' });
  }, [handleCollectPaymentMethod]);

  const handleCollectBankAccountPayment = useCallback(async () => {
    handleCollectPaymentMethod({ type: 'BankAccount' });
  }, [handleCollectPaymentMethod]);

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

    handleCollectPaymentMethod({
      type: 'PlatformPay',
      params: platformPayParams,
    });
  }, [handleCollectPaymentMethod]);

  const validateOnrampSessionParams = useCallback((): {
    isValid: boolean;
    message?: string;
  } => {
    const missingItems: string[] = [];

    if (!customerId) missingItems.push('customer authentication');
    if (!walletAddress || !walletNetwork)
      missingItems.push('wallet address registration');
    if (!currentPaymentDisplayData)
      missingItems.push('payment method selection');
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
    currentPaymentDisplayData,
    cryptoPaymentToken,
    authToken,
  ]);

  const handleCreateCryptoPaymentToken = useCallback(async () => {
    const result = await withReauth(
      () => createCryptoPaymentToken(),
      () => authorize(linkAuthIntentId)
    );

    if (result?.error) {
      showError(
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

      // Determine settlement speed based on payment method
      const settlementSpeed: 'instant' | 'standard' =
        selectedPaymentMethod === 'BankAccount'
          ? achSettlementSpeed
          : 'instant';

      const result = await createOnrampSession(
        cryptoPaymentToken!,
        walletAddress!,
        customerId!,
        authToken!,
        destinationParams.destinationNetwork,
        10.0, // sourceAmount
        'usd', // sourceCurrency
        destinationParams.destinationCurrency,
        '127.0.0.1', // customerIpAddress
        settlementSpeed
      );

      if (result.success) {
        // Cache the session ID for checkout
        setOnrampSessionId(result.data.id);

        showSuccess(
          `Onramp Session Created: Session ID: ${result.data.id}\nClient Secret: ${result.data.client_secret.substring(0, 20)}...`
        );
      } else {
        showError(
          `Failed to create onramp session: Code: ${result.error.code}\nMessage: ${result.error.message}`
        );
      }
    } catch (error) {
      showError('Failed to create onramp session.');
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
    achSettlementSpeed,
    selectedPaymentMethod,
  ]);

  const handlePerformCheckout = useCallback(async () => {
    if (!onrampSessionId) {
      showError('Please create an onramp session first.');
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
        showError(`Could not perform checkout: ${result.error.message}.`);
      } else if (result) {
        showSuccess('Checkout succeeded!');
      } else {
        showCanceled('Checkout cancelled.');
      }
    } catch (error) {
      showError('Failed to complete checkout.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [performCheckout, onrampSessionId, authToken]);

  const handleLogOut = useCallback(async () => {
    const result = await logOut();

    if (result?.error) {
      showError(`Could not log out: ${result.error.message}.`);
    } else {
      showSuccess('Logged out successfully!');
      // Reset all state to initial values
      setUserInfo({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
      });
      setLinkAuthIntentId('');
      setResponse(null);
      setIsLinkUser(false);
      setCustomerId(null);
      setCurrentPaymentDisplayData(null);
      setCryptoPaymentToken(null);
      setAuthToken(null);
      await AsyncStorage.removeItem(STORAGE_KEY_DEMO_AUTH);
      setStoredDemoAuth(null);
      setWalletAddress(null);
      setWalletNetwork(null);
      setOnrampSessionId(null);
      setSelectedPaymentMethod(null);
      setAchSettlementSpeed('instant');
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

  // Load persisted demo auth for seamless sign-in
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_DEMO_AUTH);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.email && parsed?.token) {
            setStoredDemoAuth({ email: parsed.email, token: parsed.token });
          }
        }
      } catch {}
    })();
  }, []);

  const clearPersistedDemoAuth = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_DEMO_AUTH);
    } catch {}
    setStoredDemoAuth(null);
  }, []);

  const handleSeamlessSignIn = useCallback(async () => {
    if (!storedDemoAuth) return;
    setIsSeamlessSigningIn(true);
    try {
      const latRes = await createLinkAuthToken(storedDemoAuth.token);
      if (!latRes.success) {
        await clearPersistedDemoAuth();
        showError(
          `${latRes.error.code}: ${latRes.error.message}. Please sign in manually.`
        );
        return;
      }

      const clientSecret = latRes.data.link_auth_token_client_secret;
      const result = await authenticateUserWithToken(clientSecret);
      if (result?.error) {
        await clearPersistedDemoAuth();
        showError(
          `${result.error.code}: ${result.error.message}. Please sign in manually.`
        );
        return;
      }

      // At this point, Link authentication succeeded. Persist token and fetch crypto customer id.
      setAuthToken(storedDemoAuth.token);
      setUserInfo((u) => ({ ...u, email: storedDemoAuth.email }));

      const customerResponse = await getCryptoCustomerId(storedDemoAuth.token);
      if (!customerResponse.success) {
        await clearPersistedDemoAuth();
        showError(
          `${customerResponse.error.code}: ${customerResponse.error.message}. Please sign in manually.`
        );
        return;
      }

      setCustomerId(customerResponse.data.crypto_customer_id);
      setIsLinkUser(true); // user is authenticated with Link
    } catch (e: any) {
      await clearPersistedDemoAuth();
      showError(`Please sign in manually. ${e?.message ?? ''}`);
    } finally {
      setIsSeamlessSigningIn(false);
    }
  }, [storedDemoAuth, authenticateUserWithToken, clearPersistedDemoAuth]);

  return (
    <ScrollView accessibilityLabel="onramp-flow" style={styles.container}>
      <Collapse title="User Information" initialExpanded={true}>
        {!authToken ? (
          storedDemoAuth ? (
            <>
              <Text style={[styles.infoText, styles.previouslySignedInLabel]}>
                Previously signed in as{' '}
                <Text style={styles.boldText}>{storedDemoAuth.email}</Text>.
              </Text>
              <Button
                title={
                  isSeamlessSigningIn ? 'Signing In...' : 'Seamless Sign-In'
                }
                onPress={handleSeamlessSignIn}
                variant="primary"
                disabled={isSeamlessSigningIn}
              />
              <Button
                title="Manual Sign-In"
                onPress={clearPersistedDemoAuth}
                variant="primary"
                disabled={isSeamlessSigningIn}
              />
            </>
          ) : (
            <>
              <FormField
                label="Email"
                value={userInfo.email}
                onChangeText={(text) =>
                  setUserInfo((u) => ({ ...u, email: text }))
                }
                placeholder="Email"
                autoCapitalize="none"
              />
              <FormField
                label="Password"
                value={userInfo.password}
                onChangeText={(text) =>
                  setUserInfo((u) => ({ ...u, password: text }))
                }
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
              />
              <Button
                title={authInProgress === 'login' ? 'Logging In...' : 'Log In'}
                onPress={handleLogin}
                variant="primary"
                disabled={authInProgress !== null}
              />
              <Button
                title={
                  authInProgress === 'signup' ? 'Signing Up...' : 'Sign Up'
                }
                onPress={handleSignup}
                variant="primary"
                disabled={authInProgress !== null}
              />
            </>
          )
        ) : (
          <Text style={styles.authenticatedLabel}>
            Authenticated with demo backend
          </Text>
        )}
        {authToken && isLinkUser === false && (
          <Button
            title="Verify Link User"
            onPress={checkIsLinkUser}
            variant="primary"
          />
        )}
      </Collapse>

      <OnrampResponseStatusSection
        response={response}
        customerId={customerId}
        paymentDisplayData={currentPaymentDisplayData}
        cryptoPaymentToken={cryptoPaymentToken}
        authToken={authToken}
        walletAddress={walletAddress}
        walletNetwork={walletNetwork}
        onrampSessionId={onrampSessionId}
      />

      {isLinkUser === true && customerId === null && (
        <>
          <PhoneNumberUpdateSection
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            handleUpdatePhoneNumber={handleUpdatePhoneNumber}
          />
          <LinkAuthenticationSection
            handlePresentVerification={handlePresentVerification}
          />
        </>
      )}

      {isLinkUser === true && customerId != null && (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            <Button
              title="Display Static Payment Data"
              onPress={showPaymentData}
              variant="primary"
            />
          </View>
          <AttachKycInfoSection
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            handleAttachKycInfo={handleAttachKycInfo}
          />
          <KycRefreshSection
            needsAddressUpdate={needsKycAddressUpdate}
            updatedAddress={kycUpdatedAddress}
            setUpdatedAddress={setKycUpdatedAddress}
            onVerifyKyc={(addr) => handlePresentKycVerification(addr)}
          />
          <VerifyIdentitySection handleVerifyIdentity={handleVerifyIdentity} />
          <PaymentCollectionSection
            isApplePaySupported={isApplePaySupported}
            handleCollectApplePayPayment={handleCollectApplePayPayment}
            handleCollectCardPayment={handleCollectCardPayment}
            handleCollectBankAccountPayment={handleCollectBankAccountPayment}
          />

          {selectedPaymentMethod === 'BankAccount' &&
            currentPaymentDisplayData && (
              <Collapse title="ACH Settlement Speed" initialExpanded={true}>
                <View style={styles.segmentedRow}>
                  <View style={styles.segment}>
                    <Button
                      title="Instant"
                      variant={
                        achSettlementSpeed === 'instant' ? 'primary' : 'default'
                      }
                      center
                      onPress={() => setAchSettlementSpeed('instant')}
                    />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={styles.segment}>
                    <Button
                      title="Standard"
                      variant={
                        achSettlementSpeed === 'standard'
                          ? 'primary'
                          : 'default'
                      }
                      center
                      onPress={() => setAchSettlementSpeed('standard')}
                    />
                  </View>
                </View>
              </Collapse>
            )}
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
  infoText: {},
  previouslySignedInLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
  },
  logoutContainer: {
    paddingStart: 16,
    paddingVertical: 16,
  },
  authenticatedLabel: {
    marginTop: 8,
    marginBottom: 12,
    color: 'green',
    fontWeight: '600',
    alignSelf: 'center',
    textAlign: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
  },
});
