import { useCallback, useState } from 'react';
import type { PaymentMethodCreateParams } from '../types';
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
      data: PaymentMethodCreateParams.Params,
      options: PaymentMethodCreateParams.Options = {}
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
