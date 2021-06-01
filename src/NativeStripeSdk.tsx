import { NativeModules } from 'react-native';
import type {
  PaymentMethodCreateParams,
  ApplePay,
  PaymentSheet,
  ConfirmSetupIntent,
  InitialiseParams,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  ConfirmPaymentMethodResult,
  HandleCardActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  Card,
  ApplePayResult,
} from './types';

type NativeStripeSdkType = {
  initialise(params: InitialiseParams): Promise<void>;
  createPaymentMethod(
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
  ): Promise<CreatePaymentMethodResult>;
  handleCardAction(
    paymentIntentClientSecret: string
  ): Promise<HandleCardActionResult>;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
  ): Promise<ConfirmPaymentMethodResult>;
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
  initPaymentSheet(
    params: PaymentSheet.SetupParams
  ): Promise<InitPaymentSheetResult>;
  presentPaymentSheet(
    params?: PaymentSheet.PresentParams
  ): Promise<PresentPaymentSheetResult>;
  confirmPaymentSheetPayment(): Promise<ConfirmPaymentSheetPaymentResult>;
  createTokenForCVCUpdate(cvc: string): Promise<CreateTokenForCVCUpdateResult>;
  handleURLCallback(url: string): Promise<boolean>;
  createToken(params: Card.CreateTokenParams): Promise<Card.Token>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
