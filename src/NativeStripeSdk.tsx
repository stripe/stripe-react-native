import { NativeModules } from 'react-native';
import type {
  AppInfo,
  CreatePaymentMethod,
  ThreeDSecureConfigurationParams,
  PaymentIntent,
  PaymentMethod,
  ApplePay,
  SetupIntent,
  PaymentSheet,
} from './types';

type NativeStripeSdkType = {
  initialise(
    publishableKey: string,
    appInfo: AppInfo,
    stripeAccountId?: string,
    threeDSecureParams?: ThreeDSecureConfigurationParams,
    merchantIdentifier?: string
  ): void;
  createPaymentMethod(
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<PaymentMethod>;
  handleCardAction(paymentIntentClientSecret: string): Promise<PaymentIntent>;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<PaymentIntent>;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(params: ApplePay.PresentParams): Promise<void>;
  confirmApplePayPayment(clientSecret: string): Promise<void>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<SetupIntent>;
  retrievePaymentIntent(clientSecret: string): Promise<PaymentIntent>;
  initPaymentSheet(
    params: PaymentSheet.SetupParams
  ): Promise<PaymentSheet.PaymentOption | undefined>;
  presentPaymentSheet(
    params?: PaymentSheet.PresentParams
  ): Promise<{
    paymentIntent?: PaymentIntent;
    paymentOption?: PaymentSheet.PaymentOption;
  }>;
  confirmPaymentSheetPayment(): Promise<PaymentIntent>;
  createTokenForCVCUpdate(cvc: string): Promise<string>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
