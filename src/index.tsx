// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { useConfirmSetupIntent } from './hooks/useConfirmSetupIntent';
export { useStripe } from './hooks/useStripe';
export { useApplePay, Props as UseApplePayProps } from './hooks/useApplePay';

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

export * from './types/index';
