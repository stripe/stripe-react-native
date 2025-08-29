import type { LinkUserInfo, OnrampConfiguration } from '../types/Onramp';
import type { CryptoNetwork, KycInfo } from '../types/Onramp';
import { useCallback } from 'react';
import {
  configureOnramp,
  hasLinkAccount,
  registerLinkUser,
  registerWalletAddress,
  attachKycInfo,
  updatePhoneNumber,
  authenticateUser,
  verifyIdentity,
  collectPaymentMethod,
  createCryptoPaymentToken,
  performCheckout,
  provideCheckoutClientSecret,
  onrampAuthorize,
  logout,
} from '../functions';

/**
 * useOnramp hook
 */
export function useOnramp() {
  const _configure = useCallback(
    async (config: OnrampConfiguration): Promise<void> => {
      return configureOnramp(config);
    },
    []
  );

  const _hasLinkAccount = useCallback(
    async (email: string): Promise<boolean> => {
      return hasLinkAccount(email);
    },
    []
  );

  const _registerLinkUser = useCallback(
    async (info: LinkUserInfo): Promise<string> => {
      return registerLinkUser(info);
    },
    []
  );

  const _registerWalletAddress = useCallback(
    async (walletAddress: string, network: CryptoNetwork): Promise<any> => {
      return registerWalletAddress(walletAddress, network);
    },
    []
  );

  const _attachKycInfo = useCallback(async (kycInfo: KycInfo): Promise<any> => {
    return attachKycInfo(kycInfo);
  }, []);

  const _updatePhoneNumber = useCallback(
    async (phone: string): Promise<any> => {
      return updatePhoneNumber(phone);
    },
    []
  );

  const _authenticateUser = useCallback(async (): Promise<any> => {
    return authenticateUser();
  }, []);

  const _verifyIdentity = useCallback(async (): Promise<any> => {
    return verifyIdentity();
  }, []);

  const _collectPaymentMethod = useCallback(
    async (
      paymentMethod: string,
      platformPayParams: Record<string, any>
    ): Promise<any> => {
      return collectPaymentMethod(paymentMethod, platformPayParams);
    },
    []
  );

  const _createCryptoPaymentToken = useCallback(async (): Promise<any> => {
    return createCryptoPaymentToken();
  }, []);

  const _performCheckout = useCallback(
    async (onrampSessionId: string): Promise<any> => {
      return performCheckout(onrampSessionId);
    },
    []
  );

  const _provideCheckoutClientSecret = useCallback(
    (clientSecret: string): void => {
      provideCheckoutClientSecret(clientSecret);
    },
    []
  );

  const _authorize = useCallback(
    async (linkAuthIntentId: string): Promise<any> => {
      return onrampAuthorize(linkAuthIntentId);
    },
    []
  );

  const _logout = useCallback(async (): Promise<any> => {
    return logout();
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
    logout: _logout,
  };
}
