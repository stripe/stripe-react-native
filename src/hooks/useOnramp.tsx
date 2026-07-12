import { EventSubscription, Platform } from 'react-native';
import NativeOnrampSdk from '../specs/NativeOnrampSdkModule';
import { Onramp } from '../types';
import type { Address } from '../types';
import { useCallback } from 'react';
import { addOnrampListener } from '../events';
import { CryptoPaymentToken } from '../types/Onramp';
import { getCurrentPublishableKey } from '../internal/stripeConfig';
import pjson from '../../package.json';

export function requireOnrampModule() {
  if (NativeOnrampSdk == null) {
    throw new Error(
      Platform.select({
        ios: "Onramp module is not available. Add 'stripe-react-native/Onramp' to your Podfile.",
        android:
          "Onramp module is not available. Add 'StripeSdk_includeOnramp=true' to gradle.properties.",
        default:
          "Onramp module is not available. Enable the Onramp pod on iOS and set 'StripeSdk_includeOnramp=true' on Android.",
      }) ?? 'Onramp module is not available.'
    );
  }
  return NativeOnrampSdk;
}

let onCheckoutClientSecretRequestedSubscription: EventSubscription | null =
  null;

const legacyAppAttestationUnavailableMessages = [
  'App attestation is missing or device cannot use native Link.',
  'Native Link is not available',
];
const cryptoOnrampAppAttestationUnavailableCode = 'app_attestation_unavailable';

function isLegacyAppAttestationUnavailableMessage(message?: string): boolean {
  return (
    message != null && legacyAppAttestationUnavailableMessages.includes(message)
  );
}

function publishableKeyMode(): 'live' | 'test' | undefined {
  const publishableKey = getCurrentPublishableKey();
  if (publishableKey?.startsWith('pk_live_')) {
    return 'live';
  }
  if (publishableKey?.startsWith('pk_test_')) {
    return 'test';
  }
  return undefined;
}

// Temporary React Native shim: iOS/Android currently surface this configure/create
// failure as a legacy SDK-level message instead of a typed rich error. This can be
// removed once the native SDKs map it themselves, though keeping it is harmless as
// a compatibility fallback for older native SDK versions.
function mapLegacyConfigureAppAttestationError(result: {
  error?: Onramp.CryptoOnrampError;
}): { error?: Onramp.CryptoOnrampError } {
  const error = result.error;
  if (
    error == null ||
    error.onrampErrorType != null ||
    (!isLegacyAppAttestationUnavailableMessage(error.message) &&
      !isLegacyAppAttestationUnavailableMessage(error.localizedMessage))
  ) {
    return result;
  }

  const userMessage =
    "This app couldn't be verified. Contact the app developer for help.";
  const mode = publishableKeyMode();

  const context = [
    'Context:',
    '  operation: configure',
    mode != null ? `  mode: ${mode}` : undefined,
  ].filter((line): line is string => line != null);
  const appAttestationError = {
    ...error,
    message: userMessage,
    localizedMessage: userMessage,
    stripeErrorCode: cryptoOnrampAppAttestationUnavailableCode,
    developerMessage: [
      "App attestation unavailable: this app isn't configured to use Stripe Crypto Onramp.",
      '',
      "This usually means app attestation isn't enabled for this Stripe account, or this app isn't registered as a trusted application. Use your iOS bundle ID or Android package name and contact Stripe to enable app attestation or register the app for this account.",
      '',
      ...context,
      '',
      `Code: ${cryptoOnrampAppAttestationUnavailableCode}`,
      '',
      'Next step: confirm app attestation is enabled for this Stripe account and that the app identifier is registered as trusted, then call configure again.',
      `SDK: stripe-react-native@${pjson.version}`,
    ].join('\n'),
    userMessage,
    operation: 'configure',
    mode,
  } as unknown as Onramp.CryptoOnrampError;

  return {
    ...result,
    error: appAttestationError,
  };
}

/**
 * useOnramp hook
 */
export function useOnramp() {
  const _configure = useCallback(
    async (
      config: Onramp.Configuration
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return mapLegacyConfigureAppAttestationError(
        await requireOnrampModule().configureOnramp(config)
      );
    },
    []
  );

  const _hasLinkAccount = useCallback(
    async (email: string): Promise<Onramp.HasLinkAccountResult> => {
      return requireOnrampModule().hasLinkAccount(email);
    },
    []
  );

  const _registerLinkUser = useCallback(
    async (
      info: Onramp.LinkUserInfo
    ): Promise<Onramp.RegisterLinkUserResult> => {
      return requireOnrampModule().registerLinkUser(info);
    },
    []
  );

  const _registerWalletAddress = useCallback(
    async (
      walletAddress: string,
      network: Onramp.CryptoNetwork
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return requireOnrampModule().registerWalletAddress(
        walletAddress,
        network
      );
    },
    []
  );

  const _attachKycInfo = useCallback(
    async (
      kycInfo: Onramp.KycInfo
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return requireOnrampModule().attachKycInfo(kycInfo);
    },
    []
  );

  const _retrieveMissingIdentifiers =
    useCallback(async (): Promise<Onramp.RetrieveMissingIdentifiersResult> => {
      return requireOnrampModule().retrieveMissingIdentifiers();
    }, []);

  const _submitIdentifiers = useCallback(
    async (
      identifiers: Onramp.ComplianceIdentifier[]
    ): Promise<Onramp.SubmitIdentifiersResult> => {
      return requireOnrampModule().submitIdentifiers(identifiers);
    },
    []
  );

  const _presentUserAttestation =
    useCallback(async (): Promise<Onramp.UserAttestationResult> => {
      return requireOnrampModule().presentUserAttestation();
    }, []);

  const _presentKycInfoVerification = useCallback(
    async (updatedAddress: Address | null): Promise<Onramp.VerifyKycResult> => {
      return requireOnrampModule().presentKycInfoVerification(updatedAddress);
    },
    []
  );

  const _authenticateUserWithToken = useCallback(
    async (
      linkAuthTokenClientSecret: string
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return requireOnrampModule().authenticateUserWithToken(
        linkAuthTokenClientSecret
      );
    },
    []
  );

  const _updatePhoneNumber = useCallback(
    async (phone: string): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return requireOnrampModule().updatePhoneNumber(phone);
    },
    []
  );

  const _verifyIdentity = useCallback(async (): Promise<{
    error?: Onramp.CryptoOnrampError;
  }> => {
    return requireOnrampModule().verifyIdentity();
  }, []);

  /**
   * The set of payment methods supported by crypto onramp collection.
   * - 'Card', 'BankAccount', 'CardAndBankAccount' present Link for collection.
   * - 'PlatformPay' presents Apple Pay / Google Pay using provided params.
   */
  type OnrampPaymentMethod =
    | 'Card'
    | 'BankAccount'
    | 'CardAndBankAccount'
    | 'PlatformPay';

  // Overloads for stronger type-safety at call-sites
  const _collectPaymentMethod: {
    (
      paymentMethod: 'Card' | 'BankAccount' | 'CardAndBankAccount',
      platformPayParams?: undefined
    ): Promise<Onramp.CollectPaymentMethodResult>;
    (
      paymentMethod: 'PlatformPay',
      platformPayParams: Onramp.OnrampPlatformPayParams
    ): Promise<Onramp.CollectPaymentMethodResult>;
  } = useCallback(
    async (
      paymentMethod: OnrampPaymentMethod,
      platformPayParams?: Onramp.OnrampPlatformPayParams | Record<string, never>
    ): Promise<Onramp.CollectPaymentMethodResult> => {
      return requireOnrampModule().collectPaymentMethod(
        paymentMethod,
        (platformPayParams ?? {}) as any
      );
    },
    []
  );

  const _createCryptoPaymentToken =
    useCallback(async (): Promise<Onramp.CreateCryptoPaymentTokenResult> => {
      return requireOnrampModule().createCryptoPaymentToken();
    }, []);

  const _performCheckout = useCallback(
    async (
      onrampSessionId: string,
      provideCheckoutClientSecret: () => Promise<string | null>
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      onCheckoutClientSecretRequestedSubscription?.remove();
      onCheckoutClientSecretRequestedSubscription = addOnrampListener(
        'onCheckoutClientSecretRequested',
        async () => {
          try {
            const clientSecret = await provideCheckoutClientSecret();
            requireOnrampModule().provideCheckoutClientSecret(clientSecret);
          } catch (error: any) {
            requireOnrampModule().provideCheckoutClientSecret(null);
          }
        }
      );
      return requireOnrampModule().performCheckout(onrampSessionId);
    },
    []
  );

  const _authorize = useCallback(
    async (linkAuthIntentId: string): Promise<Onramp.AuthorizeResult> => {
      return requireOnrampModule().onrampAuthorize(linkAuthIntentId);
    },
    []
  );

  const _getCryptoTokenDisplayData = useCallback(
    async (
      token: CryptoPaymentToken
    ): Promise<Onramp.PaymentDisplayDataResult> => {
      return requireOnrampModule().getCryptoTokenDisplayData(token);
    },
    []
  );

  const _logOut = useCallback(async (): Promise<{
    error?: Onramp.CryptoOnrampError;
  }> => {
    return requireOnrampModule().logout();
  }, []);

  const _isAuthError = (error?: Onramp.CryptoOnrampError): boolean => {
    const stripeErrorCode =
      error?.stripeErrorCode ??
      (error?.onrampErrorType ? error.apiErrorCode : undefined);
    if (stripeErrorCode == null) {
      return false;
    }
    const authErrorCodes = [
      'consumer_session_credentials_invalid',
      'consumer_session_expired',
    ];
    return authErrorCodes.includes(stripeErrorCode);
  };

  return {
    /**
     * Creates a `CryptoOnrampCoordinator` to facilitate authentication, identity verification, payment collection, and checkouts.
     *
     * @param config Configuration object containing merchant display name and appearance settings
     * @returns Promise that resolves to an object with an optional error property
     */
    configure: _configure,

    /**
     * Whether or not the provided email is associated with an existing Link consumer.
     *
     * @param email The email address to look up
     * @returns Promise that resolves to an object with hasLinkAccount boolean or error
     */
    hasLinkAccount: _hasLinkAccount,

    /**
     * Registers a new Link user with the provided details.
     *
     * @param info User information including email, phone, country, and optional full name
     * @returns Promise that resolves to an object with customerId or error
     */
    registerLinkUser: _registerLinkUser,

    /**
     * Registers the given crypto wallet address to the current Link account.
     * Requires an authenticated Link user.
     *
     * @param walletAddress The crypto wallet address to register
     * @param network The crypto network for the wallet address
     * @returns Promise that resolves to an object with an optional error property
     */
    registerWalletAddress: _registerWalletAddress,

    /**
     * Attaches the specific KYC info to the current Link user. Requires an authenticated Link user.
     *
     * @param kycInfo The KYC info to attach to the Link user
     * @returns Promise that resolves to an object with an optional error property
     */
    attachKycInfo: _attachKycInfo,

    /**
     * Retrieves any missing MiCA or CRS/CARF compliance identifiers for the current Link user.
     * Requires an authenticated Link user.
     *
     * @returns Promise that resolves to identifier requirements and alternatives, or error
     */
    retrieveMissingIdentifiers: _retrieveMissingIdentifiers,

    /**
     * Submits MiCA or CRS/CARF compliance identifiers for the current Link user.
     * Requires an authenticated Link user.
     *
     * @param identifiers The compliance identifiers to submit
     * @returns Promise that resolves to whether collection is complete, any remaining requirements, CARF TIN state, invalid identifiers, or error
     */
    submitIdentifiers: _submitIdentifiers,

    /**
     * Presents UI for the current Link user to accept user attestation.
     * Requires an authenticated Link user.
     *
     * @returns Promise that resolves to `Confirmed` when accepted, or error
     */
    presentUserAttestation: _presentUserAttestation,

    /**
     * Presents UI to verify KYC information for the current Link user.
     * Requires the user to be authenticated with prior calls to either `authenticateUserWithToken` or `authorize`,
     * and also requires prior KYC info attachement via `attachKycInfo`.
     *
     * @param updatedAddress: An optional updated address. Specify this parameter if the user has elected to change the address after a prior call to this API returned `UpdateAddress`. Otherwise, specify `null` to show the user's existing KYC information on the presented flow.
     *
     * @returns Promise that resolves to an instance of `VerifyKycResult` indicating whether the user confirmed their address, elected to update their address, cancelled the flow, or an error occurred.
     */
    presentKycInfoVerification: _presentKycInfoVerification,

    /**
     * Updates the user's phone number in their Link account.
     *
     * @param phone The new phone number to set for the user in E.164 format (e.g., +12125551234)
     * @returns Promise that resolves to an object with an optional error property
     */
    updatePhoneNumber: _updatePhoneNumber,

    /**
     * Authenticates the user with an encrypted Link auth token.
     * This token can be obtained by exchanging a previously consented Link OAuth token from your backend using Stripe's /v1/link/auth_token API. The response of this backend API includes information on token expiry.
     *
     * @param linkAuthTokenClientSecret An encrypted one-time-use auth token that, upon successful validation, leaves the Link account’s consumer session in an already-verified state, allowing the client to skip verification.
     * @returns Promise that resolves to an object with an optional error property if authentication fails due to an invalid token that is expired, already used, revoked, or not found, or if a network error occurs.
     */
    authenticateUserWithToken: _authenticateUserWithToken,

    /**
     * Creates an identity verification session and launches the document verification flow.
     * Requires an authenticated Link user.
     *
     * @returns Promise that resolves to an object with an optional error property
     */
    verifyIdentity: _verifyIdentity,

    /**
     * Presents UI to collect/select a payment method of the given type.
     *
     * @param paymentMethod The payment method type to collect.
     *  - 'Card' and 'BankAccount' present Link for collection.
     *  - 'PlatformPay' presents Apple Pay / Google Pay using the provided parameters.
     * @param platformPayParams Platform-specific parameters (required when `paymentMethod` is 'PlatformPay').
     *  - iOS: provide `applePay` params
     *  - Android: provide `googlePay` params
     *  - To receive Apple Pay billing details back as `kycInfo`, request `.name` and/or `.postalAddress`
     *    in `applePay.requiredBillingContactFields`
     *  - To receive Google Pay billing details back as `kycInfo`, ensure that the `GooglePayConfig`
     *    passed to `configure` has `billingAddressConfig` with `format` set to `Full` and the desired fields
     *    set to `true`.
     * @returns Promise that resolves to an object with displayData, optional kycInfo, or error
     */
    collectPaymentMethod: _collectPaymentMethod,

    /**
     * Creates a crypto payment token for the payment method currently selected on the coordinator.
     * Call after a successful `collectPaymentMethod(...)`.
     *
     * @returns Promise that resolves to an object with cryptoPaymentToken or error
     */
    createCryptoPaymentToken: _createCryptoPaymentToken,

    /**
     * Performs the checkout flow for a crypto onramp session, handling any required authentication steps.
     *
     * @param onrampSessionId The onramp session identifier
     * @param provideCheckoutClientSecret A callback that asynchronously provides the checkout client secret when requested during the checkout flow. Pass `null` to resolve with an error in the event that a client secret is unavailable.
     * @returns Promise that resolves to an object with an optional error property
     */
    performCheckout: _performCheckout,

    /**
     * Authorizes a Link auth intent and authenticates the user if necessary.
     *
     * @param linkAuthIntentId The Link auth intent ID to authorize
     * @returns Promise that resolves to an object with status and customerId or error
     */
    authorize: _authorize,

    /**
     * Retrieves display data (icon, label, sublabel) for the given payment method details.
     * Suitable for rendering in the UI to summarize the selected payment method.
     *
     * @param token The token containing payment method details (card or bank account) to get display data for
     * @returns Promise that resolves to an object with displayData or error
     */
    getCryptoTokenDisplayData: _getCryptoTokenDisplayData,

    /**
     * Logs out the current user from their Link account.
     *
     * @returns Promise that resolves to an object with an optional error property
     */
    logOut: _logOut,

    /**
     * Determines whether an error is an authentication-related error that requires re-authentication.
     * Useful for implementing automatic re-authentication flows when sessions expire or become invalid.
     *
     * @param error The error object to check, typically from onramp method calls
     * @returns True if the error indicates an authentication issue, false otherwise
     */
    isAuthError: _isAuthError,
  };
}
