import { usePaymentMethod } from './hooks/usePaymentMethod';
import {
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';

type CardDetails = {
  cardNumber: string;
  cvc: string;
  month: string;
  year: string;
  postalCode: string;
};

type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  onCardChange(cartDetails: NativeSyntheticEvent<CardDetails>): void;
};

const CardFieldNative = requireNativeComponent<CardFieldProps>('CardField');

const StripeSdk = {
  usePaymentMethod,
  CardFieldNative,
};

export { StripeProvider } from './StripeProvider';

export default StripeSdk;
