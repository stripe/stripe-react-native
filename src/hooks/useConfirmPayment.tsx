import { useCallback, useState } from 'react';
import type { CreatePaymentMethod } from '../types';
import { useStripe } from './useStripe';

/**
 * useConfirmPayment hook
 */
export function useConfirmPayment() {
  const [loading, setLoading] = useState(false);
  const { confirmPayment: confirmPaymentMethod } = useStripe();

  const confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
    ) => {
      setLoading(true);

      const result = await confirmPaymentMethod(
        paymentIntentClientSecret,
        data,
        options
      );

      setLoading(false);

      return result;
    },
    [confirmPaymentMethod]
  );

  return {
    confirmPayment,
    loading,
  };
}
