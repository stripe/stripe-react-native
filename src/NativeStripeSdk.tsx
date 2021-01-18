import { NativeModules } from 'react-native';
import type {
  CardDetails,
  ConfirmPaymentError,
  ConfirmSetupIntentError,
  Intent,
  PaymentMethod,
  StripeError,
  ThreeDSecureConfigurationParams,
  CartSummaryItem,
  BillingDetails,
  SetupIntent,
  PayWithApplePayError,
} from './types';

type NativeStripeSdkType = {
  initialise(
    publishableKey: string,
    stripeAccountId?: string,
    threeDSecureParams?: ThreeDSecureConfigurationParams,
    merchantIdentifier?: string
  ): void;
  createPaymentMethod(cardDetails: CardDetails): Promise<PaymentMethod>;
  handleNextPaymentAction(paymentIntentClientSecret: string): Promise<Intent>;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    cardDetails: CardDetails
  ): Promise<Intent>;
  registerConfirmPaymentCallbacks(
    onSuccess:
      | ((intent: Intent) => void)
      | ((error: any, intent: Intent) => void),
    onError:
      | ((error: StripeError<ConfirmPaymentError>) => void)
      | ((data: any, error: StripeError<ConfirmPaymentError>) => void)
  ): void;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  payWithApplePay(items: CartSummaryItem[]): Promise<void>;
  completePaymentWithApplePay(clientSecret: string): Promise<void>;
  registerApplePayCallbacks(
    onSuccess: () => void,
    onError: (error: StripeError<PayWithApplePayError>) => void
  ): void;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    cardDetails: CardDetails,
    billingDetails: BillingDetails
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
