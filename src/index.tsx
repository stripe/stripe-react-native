import { usePaymentMethod } from './hooks/usePaymentMethod';
import { requireNativeComponent } from 'react-native';
import type { CardFieldProps } from './types';

const CardFieldNative = requireNativeComponent<CardFieldProps>('CardField');

const StripeSdk = {
  usePaymentMethod,
  CardFieldNative,
};

export { StripeProvider } from './StripeProvider';

export default StripeSdk;
