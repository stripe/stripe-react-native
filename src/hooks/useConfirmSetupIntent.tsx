import { useCallback, useState } from 'react';
import type {
  BillingDetails,
  CardDetails,
  ConfirmSetupIntentError,
  SetupIntent,
  StripeError,
} from '../types';
import StripeSdk from '../NativeStripeSdk';
import { createHandler } from '../helpers';

type Params = {
  onError?: (error: StripeError<ConfirmSetupIntentError>) => void;
  onSuccess?: (intent: SetupIntent) => void;
};

export function useConfirmSetupIntent({
  onError = () => {},
  onSuccess = () => {},
}: Params = {}) {
  const [loading, setLoading] = useState(false);

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

      const handleSuccess = createHandler((value: SetupIntent) => {
        onSuccess(value);
        handleFinishCallback();
      });

      const handleError = createHandler(
        (value: StripeError<ConfirmSetupIntentError>) => {
          onError(value);
          handleFinishCallback();
        }
      );

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
