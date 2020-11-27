import { requireNativeComponent } from 'react-native';
import type { ApplePayButtonProps } from './types';

// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { use3dSecureConfiguration } from './hooks/use3dSecureConfiguration';
export { useStripe } from './hooks/useStripe';
export { useApplePay } from './hooks/useApplePay';

//components
export { StripeProvider } from './StripeProvider';
export { CardField } from './CardField';
export const ApplePayButton = requireNativeComponent<ApplePayButtonProps>(
  'ApplePayButton'
);
// types
export {
  CardDetails,
  Intent,
  ThreeDSecureConfigurationParams,
  PaymentMethod,
  IntentStatus,
  StripeError,
  ConfirmPaymentError,
  NextPaymentActionError,
  CreatePaymentMethodError,
} from './types';
