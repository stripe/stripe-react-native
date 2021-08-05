import { useCallback, useState } from 'react';
import type { GooglePay } from '../types';
import { useStripe } from './useStripe';

/**
 * useGooglePay hook
 */
export function useGooglePay() {
  const { initGooglePay, presentGooglePay, createGooglePayPaymentMethod } =
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

  const _presentGooglePay = useCallback(
    async (params: GooglePay.PresentGooglePayParams) => {
      setLoading(true);

      const result = await presentGooglePay(params);
      setLoading(false);

      return result;
    },
    [presentGooglePay]
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
    presentGooglePay: _presentGooglePay,
    createGooglePayPaymentMethod: _createGooglePayPaymentMethod,
  };
}
