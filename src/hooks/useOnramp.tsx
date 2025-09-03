import { Onramp } from '../types';

import NativeStripeSdk from '../specs/NativeOnrampSdkModule';
import { StripeError } from '../types';
import { OnrampError } from '../types';

const configureOnramp = async (
  config: Onramp.Configuration
): Promise<{ error?: StripeError<OnrampError> }> => {
  return NativeStripeSdk.configureOnramp(config);
};

const hasLinkAccount = async (
  email: string
): Promise<Onramp.HasLinkAccountResult> => {
  return NativeStripeSdk.hasLinkAccount(email);
};

const registerLinkUser = async (
  info: Onramp.LinkUserInfo
): Promise<Onramp.RegisterLinkUserResult> => {
  return NativeStripeSdk.registerLinkUser(info);
};

const registerWalletAddress = async (
  walletAddress: string,
  network: Onramp.CryptoNetwork
): Promise<{ error?: StripeError<OnrampError> }> => {
  return NativeStripeSdk.registerWalletAddress(walletAddress, network);
};

const attachKycInfo = async (
  kycInfo: Onramp.KycInfo
): Promise<{ error?: StripeError<OnrampError> }> => {
  return NativeStripeSdk.attachKycInfo(kycInfo);
};

const updatePhoneNumber = async (
  phone: string
): Promise<{ error?: StripeError<OnrampError> }> => {
  return NativeStripeSdk.updatePhoneNumber(phone);
};

const authenticateUser = async (): Promise<Onramp.AuthenticateUserResult> => {
  return NativeStripeSdk.authenticateUser();
};

const verifyIdentity = async (): Promise<{
  error?: StripeError<OnrampError>;
}> => {
  return NativeStripeSdk.verifyIdentity();
};

const collectPaymentMethod = async (
  paymentMethod: string,
  platformPayParams: any
): Promise<Onramp.CollectPaymentMethodResult> => {
  return NativeStripeSdk.collectPaymentMethod(paymentMethod, platformPayParams);
};

const createCryptoPaymentToken =
  async (): Promise<Onramp.CreateCryptoPaymentTokenResult> => {
    return NativeStripeSdk.createCryptoPaymentToken();
  };

const performCheckout = async (
  onrampSessionId: string
): Promise<{ error?: StripeError<OnrampError> }> => {
  return NativeStripeSdk.performCheckout(onrampSessionId);
};

const provideCheckoutClientSecret = (clientSecret: string): void => {
  NativeStripeSdk.provideCheckoutClientSecret(clientSecret);
};

const onrampAuthorize = async (
  linkAuthIntentId: string
): Promise<Onramp.AuthorizeResult> => {
  return NativeStripeSdk.onrampAuthorize(linkAuthIntentId);
};

const logOut = async (): Promise<{
  error?: StripeError<OnrampError>;
}> => {
  return NativeStripeSdk.logout();
};

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
  };
}
