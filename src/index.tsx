import { requireNativeComponent } from 'react-native';
import type { CardFieldProps } from './types';

// hooks
export { useConfirmPayment } from './hooks/useConfirmPayment';

//components
export { StripeProvider } from './StripeProvider';
export const CardFieldNative = requireNativeComponent<CardFieldProps>(
  'CardField'
);

// types
export { CardDetails } from './types';
