import type { NativeStripeSdkType } from './StripeSdk';
import { StripeSdk } from './StripeSdk';

export default StripeSdk as NativeStripeSdkType;

export {
  initStripe,
  StripeProvider,
  Props as StripeProviderProps,
} from './components/StripeProvider';
