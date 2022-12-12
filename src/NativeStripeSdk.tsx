/** Those types are shared between a new and on old architecture. Unfortunately the CodeGen does not support many things:
 * https://github.com/reactwg/react-native-new-architecture/discussions/91#discussioncomment-4282058
 * https://github.com/reactwg/react-native-new-architecture/discussions/91#discussioncomment-4282384
 * https://github.com/reactwg/react-native-new-architecture/discussions/91#discussioncomment-4282452
 * The Codegen has some limitations, hence those types have to be written manually
 */

import { NativeModules, Platform } from 'react-native';

import type {
  PaymentMethod,
  PaymentIntent,
  ApplePay,
  PaymentSheet,
  SetupIntent,
  InitialiseParams,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  ConfirmPaymentResult,
  HandleNextActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  ApplePayResult,
  CreateTokenResult,
  GooglePayInitResult,
  PayWithGooglePayResult,
  CreateGooglePayPaymentMethodResult,
  GooglePay,
  OpenApplePaySetupResult,
  Token,
  VerifyMicrodepositsParams,
  IsCardInWalletResult,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  FinancialConnections,
} from './types';

export type NativeStripeSdkType = {
  initialise(params: InitialiseParams): Promise<void>;
  createPaymentMethod(
    params: PaymentMethod.CreateParams,
    options: PaymentMethod.CreateOptions
  ): Promise<CreatePaymentMethodResult>;
  handleNextAction(
    paymentIntentClientSecret: string,
    returnURL?: string | null
  ): Promise<HandleNextActionResult>;
  confirmPayment(
    paymentIntentClientSecret: string,
    params?: PaymentIntent.ConfirmParams,
    options?: PaymentIntent.ConfirmOptions
  ): Promise<ConfirmPaymentResult>;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(params: ApplePay.PresentParams): Promise<ApplePayResult>;
  confirmApplePayPayment(clientSecret: string): Promise<void>;
  updateApplePaySummaryItems(
    summaryItems: ApplePay.CartSummaryItem[],
    errorAddressFields: Array<{
      field: ApplePay.AddressFields;
      message?: string;
    }>
  ): Promise<void>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    params: SetupIntent.ConfirmParams,
    options: SetupIntent.ConfirmOptions
  ): Promise<ConfirmSetupIntentResult>;
  retrievePaymentIntent(
    clientSecret: string
  ): Promise<RetrievePaymentIntentResult>;
  retrieveSetupIntent(clientSecret: string): Promise<RetrieveSetupIntentResult>;
  initPaymentSheet(
    params: PaymentSheet.SetupParams
  ): Promise<InitPaymentSheetResult>;
  presentPaymentSheet(): Promise<PresentPaymentSheetResult>;
  confirmPaymentSheetPayment(): Promise<ConfirmPaymentSheetPaymentResult>;
  createTokenForCVCUpdate(cvc: string): Promise<CreateTokenForCVCUpdateResult>;
  handleURLCallback(url: string): Promise<boolean>;
  createToken(params: Token.CreateParams): Promise<CreateTokenResult>;
  isGooglePaySupported(params: GooglePay.IsSupportedParams): Promise<boolean>;
  initGooglePay(params: GooglePay.InitParams): Promise<GooglePayInitResult>;
  presentGooglePay(
    params: GooglePay.PresentParams
  ): Promise<PayWithGooglePayResult>;
  createGooglePayPaymentMethod(
    params: GooglePay.CreatePaymentMethodParams
  ): Promise<CreateGooglePayPaymentMethodResult>;
  openApplePaySetup(): Promise<OpenApplePaySetupResult>;
  verifyMicrodeposits(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: VerifyMicrodepositsParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  collectBankAccount(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: PaymentMethod.CollectBankAccountParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  getConstants(): { API_VERSIONS: { CORE: string; ISSUING: string } };
  canAddCardToWallet(
    params: CanAddCardToWalletParams
  ): Promise<CanAddCardToWalletResult>;
  isCardInWallet(params: {
    cardLastFour: string;
  }): Promise<IsCardInWalletResult>;
  collectBankAccountToken(
    clientSecret: string
  ): Promise<FinancialConnections.TokenResult>;
  collectFinancialConnectionsAccounts(
    clientSecret: string
  ): Promise<FinancialConnections.SessionResult>;
  resetPaymentSheetCustomer(): Promise<null>;
};

const LINKING_ERROR =
  `The package 'react-native-stripe-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const StripeSdkModule = isTurboModuleEnabled
  ? require('./NewArchSdkWrapper').default
  : NativeModules.StripeSdk;

const StripeSdk: NativeStripeSdkType = StripeSdkModule
  ? StripeSdkModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export default StripeSdk;
