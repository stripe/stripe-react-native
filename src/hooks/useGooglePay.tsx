import { useCallback, useState } from 'react';
import type { GooglePay } from 'src/types';
import { useStripe } from './useStripe';

/**
 * useGooglePay hook
 */
export function useGooglePay() {
  const { initGooglePay, payWithGoogle, createGooglePayPaymentMethod } =
    useStripe();
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

  const _createGooglePayPaymentMethod = useCallback(
    async (params: GooglePay.CreatePaymentMethodParams) => {
      setLoading(true);

      const result = await createGooglePayPaymentMethod(params);
      setLoading(false);

      return result;
    },
    [createGooglePayPaymentMethod]
  );

  return {
    loading,
    initGooglePay: _initGooglePay,
    payWithGoogle: _payWithGoogle,
    createGooglePayPaymentMethod: _createGooglePayPaymentMethod,
  };
}
