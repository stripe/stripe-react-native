import type { CardDetails, Intent } from '../types';
import StripeSdk from '../NativeStripeSdk';
import { useCallback, useEffect, useState } from 'react';
import { isiOS } from 'src/platform';

type Params = {
  onError: (errorMessage: string) => void;
  onSuccess: (intent: Intent) => void;
};
export function useConfirmPayment({ onError, onSuccess }: Params) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleSuccess = isiOS
      ? (_: any, value: Intent) => onSuccess(value)
      : onSuccess;
    const handleError = isiOS
      ? (_: any, value: string) => {
          setLoading(false);
          onError(value);
        }
      : (value: string) => {
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
