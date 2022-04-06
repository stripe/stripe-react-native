import { useCallback, useState } from 'react';
import type { GooglePay } from '../types';
import { useStripe } from './useStripe';

/**
 * useGooglePay hook
 */
export function useGooglePay() {
  const {
    isGooglePaySupported,
    initGooglePay,
    presentGooglePay,
    createGooglePayPaymentMethod,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  const _isGooglePaySupported = useCallback(
    async (params?: GooglePay.IsSupportedParams) => {
      setLoading(true);

      const result = await isGooglePaySupported(params);
      setLoading(false);

      return result;
    },
    [isGooglePaySupported]
  );

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
    async (params: GooglePay.PresentParams) => {
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
    isGooglePaySupported: _isGooglePaySupported,
    initGooglePay: _initGooglePay,
    presentGooglePay: _presentGooglePay,
    createGooglePayPaymentMethod: _createGooglePayPaymentMethod,
  };
}
