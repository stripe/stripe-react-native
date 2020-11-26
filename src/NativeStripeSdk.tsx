import { NativeModules } from 'react-native';
import type {
  CardDetails,
  Intent,
  PaymentMethod,
  ThreeDSecureConfigurationParams,
  CartSummaryItem,
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
      | ((errorMessage: string) => void)
      | ((error: any, errorMessage: string) => void)
  ): void;
  configure3dSecure(params: ThreeDSecureConfigurationParams): void;
  isApplePaySupported(): Promise<boolean>;
  payWithApplePay(items: CartSummaryItem[]): Promise<void>;
  completePaymentWithApplePay(clientSecret: string): void;
  registerApplePayCallbacks(
    onSuccess: () => void,
    onError: (errorCode: string, errorMessage: string) => void
  ): void;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
