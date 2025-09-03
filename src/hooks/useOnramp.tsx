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
    configure: _configure,
    hasLinkAccount: _hasLinkAccount,
    registerLinkUser: _registerLinkUser,
    registerWalletAddress: _registerWalletAddress,
    attachKycInfo: _attachKycInfo,
    updatePhoneNumber: _updatePhoneNumber,
    authenticateUser: _authenticateUser,
    verifyIdentity: _verifyIdentity,
    collectPaymentMethod: _collectPaymentMethod,
    createCryptoPaymentToken: _createCryptoPaymentToken,
    performCheckout: _performCheckout,
    provideCheckoutClientSecret: _provideCheckoutClientSecret,
    authorize: _authorize,
    logOut: _logOut,
  };
}
