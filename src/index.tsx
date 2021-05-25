// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { useConfirmSetupIntent } from './hooks/useConfirmSetupIntent';
export { useStripe } from './hooks/useStripe';
export { useApplePay, Props as UseApplePayProps } from './hooks/useApplePay';
export { usePaymentSheet } from './hooks/usePaymentSheet';

//components
export {
  initStripe,
  StripeProvider,
  Props as StripeProviderProps,
} from './components/StripeProvider';
export { CardField, Props as CardFieldProps } from './components/CardField';
export {
  ApplePayButton,
  Props as ApplePayButtonProps,
} from './components/ApplePayButton';
export {
  AuBECSDebitForm,
  Props as AuBECSDebitFormProps,
} from './components/AuBECSDebitForm';
export {
  StripeContainer,
  Props as StripeContainerProps,
} from './components/StripeContainer';

export * from './functions';

export * from './types/index';
