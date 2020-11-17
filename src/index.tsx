import { usePaymentMethod } from './hooks/usePaymentMethod';
import { StripeProvider } from './StripeProvider';

const StripeSdk = {
  StripeProvider,
  usePaymentMethod,
};

export default StripeSdk;
