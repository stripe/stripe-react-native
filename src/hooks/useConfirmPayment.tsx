import { useCallback, useState } from 'react';
import type { PaymentMethodData, PaymentMethodOptions } from '../types';
import { useStripe } from './useStripe';

export function useConfirmPayment() {
  const [loading, setLoading] = useState(false);
  const { confirmPayment: confirmPaymentMethod } = useStripe();

  const confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: PaymentMethodData,
      options: PaymentMethodOptions = {}
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
