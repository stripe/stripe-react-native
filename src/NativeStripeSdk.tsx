import { NativeModules } from 'react-native';
import type {
  PaymentMethodCreateParams,
  ApplePay,
  PaymentSheet,
  ConfirmSetupIntent,
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
  CreateTokenParams,
  VerifyMicrodepositsParams,
  CollectBankAccountParams,
} from './types';

type NativeStripeSdkType = {
  initialise(params: InitialiseParams): Promise<void>;
  createPaymentMethod(
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
  ): Promise<CreatePaymentMethodResult>;
  handleNextAction(
    paymentIntentClientSecret: string
  ): Promise<HandleNextActionResult>;
  confirmPayment(
    paymentIntentClientSecret: string,
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
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
    data: ConfirmSetupIntent.Params,
    options: ConfirmSetupIntent.Options
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
  createToken(params: CreateTokenParams): Promise<CreateTokenResult>;
  isGooglePaySupported(
    params: GooglePay.IsGooglePaySupportedParams
  ): Promise<boolean>;
  initGooglePay(params: GooglePay.InitParams): Promise<GooglePayInitResult>;
  presentGooglePay(
    params: GooglePay.PresentGooglePayParams
  ): Promise<PayWithGooglePayResult>;
  createGooglePayPaymentMethod(
    params: GooglePay.CreatePaymentMethodParams
  ): Promise<CreateGooglePayPaymentMethodResult>;
  openApplePaySetup(): Promise<OpenApplePaySetupResult>;
  verifyMicrodeposits(
    type: 'payment' | 'setup',
    clientSecret: string,
    params: VerifyMicrodepositsParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  collectBankAccount(
    type: 'payment' | 'setup',
    clientSecret: string,
    params: CollectBankAccountParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
