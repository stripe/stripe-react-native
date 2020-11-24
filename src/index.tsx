import { requireNativeComponent } from 'react-native';
import type { CardFieldProps } from './types';

// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';
export { use3dSecureConfiguration } from './hooks/use3dSecureConfiguration';
export { useStripe } from './hooks/useStripe';

//components
export { StripeProvider } from './StripeProvider';
export const CardFieldNative = requireNativeComponent<CardFieldProps>(
  'CardField'
);

// types
export { CardDetails } from './types';
