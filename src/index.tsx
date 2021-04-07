import StripeSdk from './NativeStripeSdk';

// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { useConfirmSetupIntent } from './hooks/useConfirmSetupIntent';
export { useStripe } from './hooks/useStripe';
export { useApplePay, Props as UseApplePayProps } from './hooks/useApplePay';

//components
export {
  StripeProvider,
  Props as StripeProviderProps,
} from './components/StripeProvider';
export { CardField, Props as CardFieldProps } from './components/CardField';
export {
  ApplePayButton,
  Props as ApplePayButtonProps,
} from './components/ApplePayButton';

export const { initialise: initStripe } = StripeSdk;

export * from './types/index';
