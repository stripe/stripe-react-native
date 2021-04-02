import { NativeModules } from 'react-native';
import type {
  PaymentMethodCreateParams,
  ThreeDSecureConfigurationParams,
  PaymentIntent,
  PaymentMethod,
  ApplePay,
  SetupIntent,
  ConfirmSetupIntent,
  InitialiseParams,
} from './types';

type NativeStripeSdkType = {
  initialise(params: InitialiseParams): void;
  createPaymentMethod(
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
  ): Promise<PaymentMethod>;
  handleCardAction(paymentIntentClientSecret: string): Promise<PaymentIntent>;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    data: PaymentMethodCreateParams.Params,
    options: PaymentMethodCreateParams.Options
  ): Promise<PaymentIntent>;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(params: ApplePay.PresentParams): Promise<void>;
  confirmApplePayPayment(clientSecret: string): Promise<void>;
  updateApplePaySummaryItems(
    summaryItems: ApplePay.CartSummaryItem[]
  ): Promise<void>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    data: ConfirmSetupIntent.Params,
    options: ConfirmSetupIntent.Options
  ): Promise<SetupIntent>;
  retrievePaymentIntent(clientSecret: string): Promise<PaymentIntent>;
  createTokenForCVCUpdate(cvc: string): Promise<string>;
  handleURLCallback(url: string): Promise<boolean>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
