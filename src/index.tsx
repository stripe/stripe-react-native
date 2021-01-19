// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { useConfirmSetupIntent } from './hooks/useConfirmSetupIntent';
export { useStripe } from './hooks/useStripe';
export { useApplePay } from './hooks/useApplePay';

//components
export { StripeProvider } from './components/StripeProvider';
export { CardField } from './components/CardField';
export { ApplePayButton } from './components/ApplePayButton';
// types
export {
  CardDetails,
  BillingDetails,
  PaymentIntent,
  ThreeDSecureConfigurationParams,
  PaymentMethod,
  IntentStatus,
  StripeError,
  ConfirmPaymentError,
  NextPaymentActionError,
  CreatePaymentMethodError,
  ConfirmSetupIntentError,
  SetupIntent,
  NavigationBarStyle,
} from './types';
