import { useCallback, useState } from 'react';
import type { ConfirmSetupIntent } from '../types';
import { useStripe } from './useStripe';

/**
 * useConfirmSetupIntent hook
 */
export function useConfirmSetupIntent() {
  const [loading, setLoading] = useState(false);
  const { confirmSetupIntent: confirmSetupIntent } = useStripe();

  const _confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: ConfirmSetupIntent.Params,
      options: ConfirmSetupIntent.Options = {}
    ) => {
      setLoading(true);

      const result = await confirmSetupIntent(
        paymentIntentClientSecret,
        data,
        options
      );

      setLoading(false);

      return result;
    },
    [confirmSetupIntent]
  );

  return {
    confirmSetupIntent: _confirmSetupIntent,
    loading,
  };
}
