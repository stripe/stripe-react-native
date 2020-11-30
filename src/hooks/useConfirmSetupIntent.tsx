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

  const registerCallbacks = useCallback(() => {
    if (onError || onSuccess) {
      const handleSuccess = isiOS
        ? (_: any, value: SetupIntent) => onSuccess(value)
        : onSuccess;
      const handleError = isiOS
        ? (_: any, value: StripeError<ConfirmSetupIntentError>) => {
            setLoading(false);
            onError(value);
          }
        : (value: StripeError<ConfirmSetupIntentError>) => {
            setLoading(false);
            onError(value);
          };

      StripeSdk.registerConfirmSetupIntentCallbacks(handleSuccess, handleError);
    }
  }, [onError, onSuccess, setLoading]);

  const confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      cardDetails: CardDetails,
      billingDetails: BillingDetails
    ) => {
      setLoading(true);
      registerCallbacks();
      const result = await StripeSdk.confirmSetupIntent(
        paymentIntentClientSecret,
        cardDetails,
        billingDetails
      );
      setLoading(false);
      return result;
    },
    [registerCallbacks]
  );
  return {
    confirmSetupIntent,
    loading,
  };
}
