import type { NativeStripeSdkType } from './StripeSdk';
import { StripeSdk } from './StripeSdk';
import { CardFieldInput } from './types';

export default StripeSdk as NativeStripeSdkType;

export {
  initStripe,
  StripeProvider,
  Props as StripeProviderProps,
} from './components/StripeProvider';

export { CardFieldInput };
export { Commands as CardFieldCommands } from './spec/CardFieldViewNativeComponent';
export { CardField, Props as CardFieldProps } from './components/CardField';
