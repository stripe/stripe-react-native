import NativeStripeSdk from '../specs/NativeOnrampSdkModule';
import type { Onramp, OnrampError, StripeError } from '../types';
import { useCallback } from 'react';

/**
 * useOnramp hook
 */
export function useOnramp() {
  const _configure = useCallback(
    async (
      config: Onramp.Configuration
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeStripeSdk.configureOnramp(config);
    },
    []
  );

  const _hasLinkAccount = useCallback(
    async (email: string): Promise<Onramp.HasLinkAccountResult> => {
      return NativeStripeSdk.hasLinkAccount(email);
    },
    []
  );

  const _registerLinkUser = useCallback(
    async (
      info: Onramp.LinkUserInfo
    ): Promise<Onramp.RegisterLinkUserResult> => {
      return NativeStripeSdk.registerLinkUser(info);
    },
    []
  );

  const _registerWalletAddress = useCallback(
    async (
      walletAddress: string,
      network: Onramp.CryptoNetwork
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeStripeSdk.registerWalletAddress(walletAddress, network);
    },
    []
  );

  const _attachKycInfo = useCallback(
    async (
      kycInfo: Onramp.KycInfo
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeStripeSdk.attachKycInfo(kycInfo);
    },
    []
  );

  const _updatePhoneNumber = useCallback(
    async (phone: string): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeStripeSdk.updatePhoneNumber(phone);
    },
    []
  );

  const _authenticateUser =
    useCallback(async (): Promise<Onramp.AuthenticateUserResult> => {
      return NativeStripeSdk.authenticateUser();
    }, []);

  const _verifyIdentity = useCallback(async (): Promise<{
    error?: StripeError<OnrampError>;
  }> => {
    return NativeStripeSdk.verifyIdentity();
  }, []);

  const _collectPaymentMethod = useCallback(
    async (
      paymentMethod: string,
      platformPayParams: any
    ): Promise<Onramp.CollectPaymentMethodResult> => {
      return NativeStripeSdk.collectPaymentMethod(
        paymentMethod,
        platformPayParams
      );
    },
    []
  );

  const _createCryptoPaymentToken =
    useCallback(async (): Promise<Onramp.CreateCryptoPaymentTokenResult> => {
      return NativeStripeSdk.createCryptoPaymentToken();
    }, []);

  const _performCheckout = useCallback(
    async (
      onrampSessionId: string
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeStripeSdk.performCheckout(onrampSessionId);
    },
    []
  );

  const _provideCheckoutClientSecret = useCallback(
    (clientSecret: string): void => {
      NativeStripeSdk.provideCheckoutClientSecret(clientSecret);
    },
    []
  );

  const _authorize = useCallback(
    async (linkAuthIntentId: string): Promise<Onramp.AuthorizeResult> => {
      return NativeStripeSdk.onrampAuthorize(linkAuthIntentId);
    },
    []
  );

  const _logOut = useCallback(async (): Promise<{
    error?: StripeError<OnrampError>;
  }> => {
    return NativeStripeSdk.logout();
  }, []);

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
     * Updates the user's phone number in their Link account.
     *
     * @param phone The new phone number to set for the user
     * @returns Promise that resolves to an object with an optional error property
     */
    updatePhoneNumber: _updatePhoneNumber,

    /**
     * Presents Link UI to authenticate an existing Link user.
     * `hasLinkAccount` must be called before this.
     *
     * @returns Promise that resolves to an object with customerId or error
     */
    authenticateUser: _authenticateUser,

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
     * @param paymentMethod The payment method type to collect. For 'Card' and 'BankAccount', this presents Link. For 'PlatformPay', this presents Apple Pay using the provided platform pay parameters
     * @param platformPayParams Platform-specific parameters (required for PlatformPay)
     * @returns Promise that resolves to an object with displayData or error
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
     * @returns Promise that resolves to an object with an optional error property
     */
    performCheckout: _performCheckout,

    /**
     * Provides a checkout client secret in response to a checkout client secret request.
     *
     * @param clientSecret The client secret for the checkout session
     */
    provideCheckoutClientSecret: _provideCheckoutClientSecret,

    /**
     * Authorizes a Link auth intent and authenticates the user if necessary.
     *
     * @param linkAuthIntentId The Link auth intent ID to authorize
     * @returns Promise that resolves to an object with status and customerId or error
     */
    authorize: _authorize,

    /**
     * Logs out the current user from their Link account.
     *
     * @returns Promise that resolves to an object with an optional error property
     */
    logOut: _logOut,
  };
}
