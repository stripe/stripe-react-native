import { NativeModules } from 'react-native';
import type { CardDetails, Intent } from './types';

type NativeStripeSdkType = {
  initialise(publishableKey: string): void;
  confirmPaymentMethod(
    paymentIntentClientSecret: string,
    cardDetails: CardDetails
  ): Promise<Intent>;
  registerConfirmPaymentCallbacks(
    onSuccess:
      | ((intent: Intent) => void)
      | ((error: any, intent: Intent) => void),
    onError:
      | ((errorMessage: string) => void)
      | ((error: any, errorMessage: string) => void)
  ): void;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
