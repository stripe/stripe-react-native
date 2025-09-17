import { EventSubscription } from 'react-native';
import NativeOnrampSdk from '../specs/NativeOnrampSdkModule';
import type {
  Onramp,
  OnrampError,
  PaymentOptionData,
  StripeError,
} from '../types';
import type { PlatformPay } from '../types';
import { useCallback } from 'react';
import { addOnrampListener } from '../events';
import {
  BankAccountPaymentMethodParams,
  CardPaymentMethodParams,
} from '../types/Onramp';

let onCheckoutClientSecretRequestedSubscription: EventSubscription | null =
  null;

/**
 * useOnramp hook
 */
export function useOnramp() {
  const _configure = useCallback(
    async (
      config: Onramp.Configuration
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeOnrampSdk.configureOnramp(config);
    },
    []
  );

  const _hasLinkAccount = useCallback(
    async (email: string): Promise<Onramp.HasLinkAccountResult> => {
      return NativeOnrampSdk.hasLinkAccount(email);
    },
    []
  );

  const _registerLinkUser = useCallback(
    async (
      info: Onramp.LinkUserInfo
    ): Promise<Onramp.RegisterLinkUserResult> => {
      return NativeOnrampSdk.registerLinkUser(info);
    },
    []
  );

  const _registerWalletAddress = useCallback(
    async (
      walletAddress: string,
      network: Onramp.CryptoNetwork
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeOnrampSdk.registerWalletAddress(walletAddress, network);
    },
    []
  );

  const _attachKycInfo = useCallback(
    async (
      kycInfo: Onramp.KycInfo
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeOnrampSdk.attachKycInfo(kycInfo);
    },
    []
  );

  const _updatePhoneNumber = useCallback(
    async (phone: string): Promise<{ error?: StripeError<OnrampError> }> => {
      return NativeOnrampSdk.updatePhoneNumber(phone);
    },
    []
  );

  const _authenticateUser =
    useCallback(async (): Promise<Onramp.AuthenticateUserResult> => {
      return NativeOnrampSdk.authenticateUser();
    }, []);

  const _verifyIdentity = useCallback(async (): Promise<{
    error?: StripeError<OnrampError>;
  }> => {
    return NativeOnrampSdk.verifyIdentity();
  }, []);

  /**
   * The set of payment methods supported by crypto onramp collection.
   * - 'Card' and 'BankAccount' present Link for collection.
   * - 'PlatformPay' presents Apple Pay / Google Pay using provided params.
   */
  type OnrampPaymentMethod = 'Card' | 'BankAccount' | 'PlatformPay';

  // Overloads for stronger type-safety at call-sites
  const _collectPaymentMethod: {
    (
      paymentMethod: 'Card' | 'BankAccount',
      platformPayParams?: undefined
    ): Promise<Onramp.CollectPaymentMethodResult>;
    (
      paymentMethod: 'PlatformPay',
      platformPayParams: PlatformPay.PaymentMethodParams
    ): Promise<Onramp.CollectPaymentMethodResult>;
  } = useCallback(
    async (
      paymentMethod: OnrampPaymentMethod,
      platformPayParams?:
        | PlatformPay.PaymentMethodParams
        | Record<string, never>
    ): Promise<Onramp.CollectPaymentMethodResult> => {
      return NativeOnrampSdk.collectPaymentMethod(
        paymentMethod,
        (platformPayParams ?? {}) as any
      );
    },
    []
  );

  const _createCryptoPaymentToken =
    useCallback(async (): Promise<Onramp.CreateCryptoPaymentTokenResult> => {
      return NativeOnrampSdk.createCryptoPaymentToken();
    }, []);

  const _performCheckout = useCallback(
    async (
      onrampSessionId: string,
      provideCheckoutClientSecret: () => Promise<string | null>
    ): Promise<{ error?: StripeError<OnrampError> }> => {
      onCheckoutClientSecretRequestedSubscription?.remove();
      onCheckoutClientSecretRequestedSubscription = addOnrampListener(
        'onCheckoutClientSecretRequested',
        async () => {
          try {
            const clientSecret = await provideCheckoutClientSecret();
            NativeOnrampSdk.provideCheckoutClientSecret(clientSecret);
          } catch (error: any) {
            NativeOnrampSdk.provideCheckoutClientSecret(null);
          }
        }
      );
      return NativeOnrampSdk.performCheckout(onrampSessionId);
    },
    []
  );

  const _authorize = useCallback(
    async (linkAuthIntentId: string): Promise<Onramp.AuthorizeResult> => {
      return NativeOnrampSdk.onrampAuthorize(linkAuthIntentId);
    },
    []
  );

  const _paymentDisplayData = useCallback(
    async (
      paymentParams: CardPaymentMethodParams | BankAccountPaymentMethodParams
    ): Promise<PaymentOptionData> => {
      return NativeOnrampSdk.paymentDisplayData(paymentParams);
    },
    []
  );

  const _logOut = useCallback(async (): Promise<{
    error?: StripeError<OnrampError>;
  }> => {
    return NativeOnrampSdk.logout();
  }, []);

  const _isAuthError = (error: any): boolean => {
    const stripeErrorCode = error?.stripeErrorCode;
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
     * Updates the user's phone number in their Link account.
     *
     * @param phone The new phone number to set for the user in E.164 format (e.g., +12125551234)
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
     * @param paymentMethod The payment method type to collect.
     *  - 'Card' and 'BankAccount' present Link for collection.
     *  - 'PlatformPay' presents Apple Pay / Google Pay using the provided parameters.
     * @param platformPayParams Platform-specific parameters (required when `paymentMethod` is 'PlatformPay').
     *  - iOS: provide `applePay` params
     *  - Android: provide `googlePay` params
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
     * Authorizes a Link auth intent and authenticates the user if necessary.
     *
     * @param linkAuthIntentId The Link auth intent ID to authorize
     * @returns Promise that resolves to an object with status and customerId or error
     */
    authorize: _authorize,

    paymentDisplayData: _paymentDisplayData,

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
