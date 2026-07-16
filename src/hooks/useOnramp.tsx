import { EventSubscription, Platform } from 'react-native';
import NativeOnrampSdk from '../specs/NativeOnrampSdkModule';
import { Onramp } from '../types';
import type { Address } from '../types';
import { useCallback } from 'react';
import { addOnrampListener } from '../events';
import { CryptoPaymentToken } from '../types/Onramp';

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

/**
 * useOnramp hook
 */
export function useOnramp() {
  const _configure = useCallback(
    async (
      config: Onramp.Configuration
    ): Promise<{ error?: Onramp.CryptoOnrampError }> => {
      return requireOnrampModule().configureOnramp(config);
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

  const _getWalletOwnershipChallenge = useCallback(
    async (
      walletAddress: string,
      network: Onramp.CryptoNetwork
    ): Promise<Onramp.GetWalletOwnershipChallengeResult> => {
      return requireOnrampModule().getWalletOwnershipChallenge(
        walletAddress,
        network
      );
    },
    []
  );

  const _submitWalletOwnershipSignature = useCallback(
    async (
      challengeId: string,
      signature: string
    ): Promise<Onramp.SubmitWalletOwnershipSignatureResult> => {
      return requireOnrampModule().submitWalletOwnershipSignature(
        challengeId,
        signature
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
      (error != null && 'apiErrorCode' in error
        ? error.apiErrorCode
        : undefined);
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
     * Creates a short-lived challenge for proving ownership of a registered wallet.
     * Requires an authenticated Link user.
     *
     * @param walletAddress The registered crypto wallet address to verify
     * @param network The crypto network for the wallet address
     * @returns Promise that resolves to the challenge whose message must be signed, or an error
     */
    getWalletOwnershipChallenge: _getWalletOwnershipChallenge,

    /**
     * Verifies a signature over a previously issued wallet ownership challenge.
     * Requires an authenticated Link user.
     *
     * @param challengeId The opaque identifier returned by `getWalletOwnershipChallenge`
     * @param signature The signature produced over the exact challenge message
     * @returns Promise that resolves to the verified consumer wallet, or an error
     */
    submitWalletOwnershipSignature: _submitWalletOwnershipSignature,

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
