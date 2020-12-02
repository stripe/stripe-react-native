import { useCallback, useState } from 'react';
import type {
  BillingDetails,
  CardDetails,
  ConfirmSetupIntentError,
  SetupIntent,
  StripeError,
} from '../types';
import StripeSdk from '../NativeStripeSdk';
import { isiOS } from '../platform';

type Params = {
  onError?: (error: StripeError<ConfirmSetupIntentError>) => void;
  onSuccess?: (intent: SetupIntent) => void;
};

export function useConfirmSetupIntent(params?: Params) {
  const [loading, setLoading] = useState(false);

  const { onError = () => {}, onSuccess = () => {} } = params || {};

  const handleFinishCallback = useCallback(() => {
    setLoading(false);
    StripeSdk.unregisterConfirmSetupIntentCallbacks();
  }, []);

  const confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      cardDetails: CardDetails,
      billingDetails: BillingDetails
    ) => {
      setLoading(true);

      const handleSuccess = isiOS
        ? (_: any, value: SetupIntent) => {
            onSuccess(value);
            handleFinishCallback();
          }
        : onSuccess;

      const handleError = isiOS
        ? (_: any, value: StripeError<ConfirmSetupIntentError>) => {
            onError(value);
            handleFinishCallback();
          }
        : (value: StripeError<ConfirmSetupIntentError>) => {
            onError(value);
            handleFinishCallback();
          };

      StripeSdk.registerConfirmSetupIntentCallbacks(handleSuccess, handleError);

      const result = await StripeSdk.confirmSetupIntent(
        paymentIntentClientSecret,
        cardDetails,
        billingDetails
      );
      setLoading(false);
      return result;
    },
    [onError, onSuccess, handleFinishCallback]
  );
  return {
    confirmSetupIntent,
    loading,
  };
}
