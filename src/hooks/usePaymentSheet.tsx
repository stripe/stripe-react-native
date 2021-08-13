import type { PaymentSheet } from '../types';
import { useState } from 'react';
import { useStripe } from './useStripe';

/**
 * usePaymentSheet hook
 */
export function usePaymentSheet() {
  const {
    initPaymentSheet: initPaymentSheetNative,
    presentPaymentSheet: presentPaymentSheetNative,
    confirmPaymentSheetPayment: confirmPaymentSheetPaymentNative,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  const initPaymentSheet = async (params: PaymentSheet.SetupParams) => {
    setLoading(true);
    const result = await initPaymentSheetNative(params);
    setLoading(false);
    return result;
  };

  const presentPaymentSheet = async () => {
    setLoading(true);
    const result = await presentPaymentSheetNative();
    setLoading(false);
    return result;
  };

  const confirmPaymentSheetPayment = async () => {
    setLoading(true);
    const result = await confirmPaymentSheetPaymentNative();
    setLoading(false);
    return result;
  };

  return {
    loading,
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
  };
}
