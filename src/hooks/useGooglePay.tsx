import { useCallback, useEffect, useState } from 'react';
import { useStripe } from './useStripe';

export interface Props {}

/**
 * useGooglePay hook
 */
export function useApplePay({}: Props = {}) {
  const { initGooglePay } = useStripe();
  const [loading, setLoading] = useState(false);
  const [isGooglePayReady, setGooglePayReady] = useState(false);

  const _initGooglePay = useCallback(async () => {
    setLoading(true);

    const result = await initGooglePay({});
    setGooglePayReady(result.isReady);
    setLoading(false);

    return result;
  }, [initGooglePay]);

  useEffect(() => {}, []);

  return {
    loading,
    isGooglePayReady,
    initGooglePay: _initGooglePay,
  };
}
