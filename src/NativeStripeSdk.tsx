import { NativeModules } from 'react-native';
import type {
  ConfirmPaymentError,
  ConfirmSetupIntentError,
  PaymentIntent,
  PaymentMethod,
  StripeError,
  ThreeDSecureConfigurationParams,
  CartSummaryItem,
  SetupIntent,
  PresentApplePayError,
  AppInfo,
  CreatePaymentMethod,
} from '@stripe/stripe-react-native';

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
  registerConfirmPaymentCallbacks(
    onSuccess:
      | ((intent: PaymentIntent) => void)
      | ((error: any, intent: PaymentIntent) => void),
    onError:
      | ((error: StripeError<ConfirmPaymentError>) => void)
      | ((data: any, error: StripeError<ConfirmPaymentError>) => void)
  ): void;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  presentApplePay(items: CartSummaryItem[]): Promise<void>;
  confirmApplePayPayment(clientSecret: string): Promise<void>;
  registerApplePayCallbacks(
    onSuccess: () => void,
    onError: (error: StripeError<PresentApplePayError>) => void
  ): void;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<SetupIntent>;
  registerConfirmSetupIntentCallbacks(
    onSuccess:
      | ((intent: SetupIntent) => void)
      | ((error: any, intent: SetupIntent) => void),
    onError:
      | ((error: StripeError<ConfirmSetupIntentError>) => void)
      | ((data: any, error: StripeError<ConfirmSetupIntentError>) => void)
  ): void;
  unregisterConfirmPaymentCallbacks(): void;
  unregisterApplePayCallbacks(): void;
  unregisterConfirmSetupIntentCallbacks(): void;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
