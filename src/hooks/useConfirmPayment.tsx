import { useCallback, useState } from 'react';
import type { PaymentIntent } from '../types';
import { useStripe } from './useStripe';

/**
 * useConfirmPayment hook
 */
export function useConfirmPayment() {
  const [loading, setLoading] = useState(false);
  const { confirmPayment } = useStripe();

  const _confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      data?: PaymentIntent.ConfirmParams,
      options: PaymentIntent.ConfirmOptions = {}
    ) => {
      setLoading(true);

      const result = await confirmPayment(
        paymentIntentClientSecret,
        data,
        options
      );

      setLoading(false);

      return result;
    },
    [confirmPayment]
  );

  return {
    confirmPayment: _confirmPayment,
    loading,
  };
}
