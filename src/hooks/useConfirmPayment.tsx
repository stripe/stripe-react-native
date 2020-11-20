import type { CardDetails, Intent } from '../types';
import StripeSdk from '../NativeStripeSdk';
import { useCallback, useEffect, useState } from 'react';

type Params = {
  onError: (errorMessage: string) => void;
  onSuccess: (intent: Intent) => void;
};
export function useConfirmPayment({ onError, onSuccess }: Params) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    StripeSdk.registerConfirmPaymentCallbacks(onSuccess, onError);
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
