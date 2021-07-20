import { useCallback, useState } from 'react';
import type { GooglePay } from 'src/types';
import { useStripe } from './useStripe';

/**
 * useGooglePay hook
 */
export function useGooglePay() {
  const {
    initGooglePay,
    payWithGoogle,
    getTokenizationSpecification,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  const _initGooglePay = useCallback(
    async (params: GooglePay.InitParams) => {
      setLoading(true);

      const result = await initGooglePay(params);
      setLoading(false);

      return result;
    },
    [initGooglePay]
  );

  const _payWithGoogle = useCallback(
    async (params: GooglePay.PayParams) => {
      setLoading(true);

      const result = await payWithGoogle(params);
      setLoading(false);

      return result;
    },
    [payWithGoogle]
  );

  return {
    loading,
    initGooglePay: _initGooglePay,
    payWithGoogle: _payWithGoogle,
    getTokenizationSpecification,
  };
}
