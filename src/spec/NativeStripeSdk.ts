import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  initialise(params: Object): Promise<void>;
  createPaymentMethod(params: Object, options: Object): Promise<Object>;
  handleNextAction(
    paymentIntentClientSecret: string,
    returnURL?: string | null
  ): Promise<Object>;
  confirmPayment(
    paymentIntentClientSecret: string,
    params?: Object,
    options?: Object
  ): Promise<Object>;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(params: Object): Promise<Object>;
  confirmApplePayPayment(clientSecret: Object): Promise<void>;
  updateApplePaySummaryItems(
    summaryItems: Object,
    errorAddressFields: Array<{
      field: Object;
      message?: string;
    }>
  ): Promise<void>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    params: Object,
    options: Object
  ): Promise<Object>;
  retrievePaymentIntent(clientSecret: string): Promise<Object>;
  retrieveSetupIntent(clientSecret: string): Promise<Object>;
  initPaymentSheet(params: Object): Promise<Object>;
  presentPaymentSheet(): Promise<Object>;
  confirmPaymentSheetPayment(): Promise<Object>;
  createTokenForCVCUpdate(cvc: string): Promise<Object>;
  handleURLCallback(url: string): Promise<boolean>;
  createToken(params: Object): Promise<Object>;
  isGooglePaySupported(params: Object): Promise<boolean>;
  initGooglePay(params: Object): Promise<Object>;
  presentGooglePay(params: Object): Promise<Object>;
  createGooglePayPaymentMethod(params: Object): Promise<Object>;
  openApplePaySetup(): Promise<Object>;
  verifyMicrodeposits(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: Object
  ): Promise<Object>;
  collectBankAccount(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: Object
  ): Promise<Object>;
  getConstants(): { API_VERSIONS: { CORE: string; ISSUING: string } };
  canAddCardToWallet(params: Object): Promise<Object>;
  isCardInWallet(params: { cardLastFour: string }): Promise<Object>;
  collectBankAccountToken(clientSecret: string): Promise<Object>;
  collectFinancialConnectionsAccounts(clientSecret: string): Promise<Object>;
  resetPaymentSheetCustomer(): Promise<null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StripeSdk');
