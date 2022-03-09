import { useCallback, useState } from 'react';
import type { PaymentMethod } from '../types';
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
      data: PaymentMethod.ConfirmParams,
      options: PaymentMethod.ConfirmOptions = {}
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
