import { NativeModules } from 'react-native';
import type {
  PaymentIntent,
  PaymentMethod,
  ThreeDSecureConfigurationParams,
  PresentApplePayParams,
  SetupIntent,
  AppInfo,
  PaymentMethodData,
  PaymentMethodOptions,
  SetupPaymentSheetParams,
  PaymentOption,
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
    data: PaymentMethodData,
    options: PaymentMethodOptions
  ): Promise<PaymentMethod>;
  handleCardAction(paymentIntentClientSecret: string): Promise<PaymentIntent>;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    data: PaymentMethodData,
    options: PaymentMethodOptions
  ): Promise<PaymentIntent>;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(params: PresentApplePayParams): Promise<void>;
  confirmApplePayPayment(clientSecret: string): Promise<void>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    data: PaymentMethodData,
    options: PaymentMethodOptions
  ): Promise<SetupIntent>;
  retrievePaymentIntent(clientSecret: string): Promise<PaymentIntent>;
  setupPaymentSheet(
    params: SetupPaymentSheetParams
  ): Promise<PaymentOption | undefined>;
  presentPaymentSheet(clientSecret?: string): Promise<PaymentIntent>;
  paymentSheetConfirmPayment(): Promise<PaymentIntent>;
  presentPaymentOptions(): Promise<PaymentOption | undefined>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
