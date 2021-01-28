import { useCallback, useState } from 'react';
import type {
  ConfirmSetupIntentError,
  SetupIntent,
  StripeError,
  CreatePaymentMethod,
} from '@stripe/stripe-react-native';
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
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
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
        data,
        options
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
