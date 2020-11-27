import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleSuccess = isiOS
      ? (_: any, value: Intent) => onSuccess(value)
      : onSuccess;
    const handleError = isiOS
      ? (_: any, value: StripeError<ConfirmPaymentError>) => {
          setLoading(false);
          onError(value);
        }
      : (value: StripeError<ConfirmPaymentError>) => {
          setLoading(false);
          onError(value);
        };

    StripeSdk.registerConfirmPaymentCallbacks(handleSuccess, handleError);
  }, [onError, onSuccess]);

  const confirmPayment = useCallback(
    async (paymentIntentClientSecret: string, cardDetails: CardDetails) => {
      setLoading(true);
      const result = await StripeSdk.confirmPaymentMethod(
        paymentIntentClientSecret,
        cardDetails
      );
      setLoading(false);
      return result;
    },
    []
  );
  return {
    confirmPayment,
    loading,
  };
}
