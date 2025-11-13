import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';
import type { Address, InitialiseParams, Onramp } from '../types';
import type { UnsafeObject } from './utils';

export interface Spec extends TurboModule {
  initialise(params: UnsafeObject<InitialiseParams>): Promise<void>;
  configureOnramp(
    config: UnsafeObject<Onramp.Configuration>
  ): Promise<Onramp.VoidResult>;
  hasLinkAccount(email: string): Promise<Onramp.HasLinkAccountResult>;
  registerLinkUser(
    info: UnsafeObject<Onramp.LinkUserInfo>
  ): Promise<Onramp.RegisterLinkUserResult>;
  registerWalletAddress(
    walletAddress: string,
    network: string
  ): Promise<Onramp.VoidResult>;
  attachKycInfo(
    kycInfo: UnsafeObject<Onramp.KycInfo>
  ): Promise<Onramp.VoidResult>;
  presentKycInfoVerification: (
    updatedAddress: UnsafeObject<Address> | null
  ) => Promise<Onramp.VerifyKycResult>;
  updatePhoneNumber(phone: string): Promise<Onramp.VoidResult>;
  authenticateUser(): Promise<Onramp.AuthenticateUserResult>;
  authenticateUserWithToken(
    linkAuthTokenClientSecret: string
  ): Promise<Onramp.VoidResult>;
  verifyIdentity(): Promise<Onramp.VoidResult>;
  collectPaymentMethod(
    paymentMethod: string,
    platformPayParams: UnsafeObject<any>
  ): Promise<Onramp.CollectPaymentMethodResult>;
  provideCheckoutClientSecret(clientSecret: string | null): void;
  onCheckoutClientSecretRequested: EventEmitter<UnsafeObject<any>>;
  createCryptoPaymentToken(): Promise<Onramp.CreateCryptoPaymentTokenResult>;
  performCheckout(onrampSessionId: string): Promise<Onramp.VoidResult>;
  onrampAuthorize(linkAuthIntentId: string): Promise<Onramp.AuthorizeResult>;
  getCryptoTokenDisplayData(
    token: UnsafeObject<Onramp.CryptoPaymentToken>
  ): Promise<Onramp.PaymentDisplayDataResult>;
  logout(): Promise<Onramp.VoidResult>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OnrampSdk');
