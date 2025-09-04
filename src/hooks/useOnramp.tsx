import {
  attachKycInfo,
  authenticateUser,
  collectPaymentMethod,
  configureOnramp,
  createCryptoPaymentToken,
  hasLinkAccount,
  isAuthError,
  logOut,
  onrampAuthorize,
  performCheckout,
  provideCheckoutClientSecret,
  registerLinkUser,
  registerWalletAddress,
  updatePhoneNumber,
  verifyIdentity,
} from '../functions';

/**
 * useOnramp hook
 */
export function useOnramp() {
  return {
    configure: configureOnramp,
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
    authorize: onrampAuthorize,
    logOut,
    isAuthError,
  };
}
