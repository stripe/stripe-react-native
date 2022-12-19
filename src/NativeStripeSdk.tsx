import { NativeModules } from 'react-native';
import type {
  PaymentMethod,
  PaymentIntent,
  ApplePay,
  PlatformPay,
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

type NativeStripeSdkType = {
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
  isPlatformPaySupported(params: {
    googlePay?: GooglePay.IsSupportedParams;
  }): Promise<boolean>;
  createPlatformPayPaymentMethod(
    params: PlatformPay.PaymentMethodParams,
    usesDeprecatedTokenFlow: boolean
  ): Promise<PlatformPay.PaymentMethodResult | PlatformPay.TokenResult>;
  dismissPlatformPay(): Promise<boolean>;
  updatePlatformPaySheet(
    summaryItems: Array<ApplePay.CartSummaryItem>,
    shippingMethods: Array<ApplePay.ShippingMethod>,
    errors: Array<PlatformPay.ApplePaySheetError>
  ): Promise<void>;
  confirmPlatformPay(
    clientSecret: string,
    params: PlatformPay.ConfirmParams,
    isPaymentIntent: boolean
  ): Promise<
    PlatformPay.ConfirmPaymentResult | PlatformPay.ConfirmSetupIntentResult
  >;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
