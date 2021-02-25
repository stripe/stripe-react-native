import { useCallback, useState } from 'react';
import type { CreatePaymentMethod } from '../types';
import { useStripe } from './useStripe';

/**
 * useConfirmSetupIntent hook
 */
export function useConfirmSetupIntent() {
  const [loading, setLoading] = useState(false);
  const { confirmSetupIntent: confirmSetupIntentNative } = useStripe();

  const confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
    ) => {
      setLoading(true);

      const result = await confirmSetupIntentNative(
        paymentIntentClientSecret,
        data,
        options
      );

      setLoading(false);

      return result;
    },
    [confirmSetupIntentNative]
  );

  return {
    confirmSetupIntent,
    loading,
  };
}
