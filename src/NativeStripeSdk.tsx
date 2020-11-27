import { NativeModules } from 'react-native';
import type {
  CardDetails,
  ConfirmPaymentError,
  Intent,
  PaymentMethod,
  StripeError,
  ThreeDSecureConfigurationParams,
  CartSummaryItem,
  PayWithApplePayError,
} from './types';

type NativeStripeSdkType = {
  initialise(publishableKey: string, merchantIdentifier?: string): void;
  createPaymentMethod(cardDetails: CardDetails): Promise<PaymentMethod>;
  handleNextPaymentAction(
    paymentIntentClientSecret: string
  ): Promise<Intent & { requiresConfirmation?: boolean }>;
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
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
