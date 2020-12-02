import { useCallback, useState } from 'react';
import type {
  CardDetails,
  ConfirmPaymentError,
  Intent,
  StripeError,
} from '../types';
import StripeSdk from '../NativeStripeSdk';
import { isiOS } from '../platform';

type Params = {
  onError: (error: StripeError<ConfirmPaymentError>) => void;
  onSuccess: (intent: Intent) => void;
};

export function useConfirmPayment({ onError, onSuccess }: Params) {
  const [loading, setLoading] = useState(false);

  const handleFinishCallback = useCallback(() => {
    setLoading(false);
    StripeSdk.unregisterConfirmPaymentCallbacks();
  }, []);

  const confirmPayment = useCallback(
    async (paymentIntentClientSecret: string, cardDetails: CardDetails) => {
      const handleSuccess = isiOS
        ? (_: any, value: Intent) => {
            onSuccess(value);
            handleFinishCallback();
          }
        : (value: Intent) => {
            onSuccess(value);
            handleFinishCallback();
          };

      const handleError = isiOS
        ? (_: any, value: StripeError<ConfirmPaymentError>) => {
            onError(value);
            handleFinishCallback();
          }
        : (value: StripeError<ConfirmPaymentError>) => {
            onError(value);
            handleFinishCallback();
          };

      StripeSdk.registerConfirmPaymentCallbacks(handleSuccess, handleError);

      setLoading(true);
      const result = await StripeSdk.confirmPaymentMethod(
        paymentIntentClientSecret,
        cardDetails
      );
      setLoading(false);
      return result;
    },
    [handleFinishCallback, onSuccess, onError]
  );

  return {
    confirmPayment,
    loading,
  };
}
