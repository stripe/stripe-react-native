import { useState, useCallback } from 'react';
import { useStripe } from './useStripe';

import type { PaymentSheet } from '../types';

/**
 * usePaymentSheet hook
 */
export function usePaymentSheet() {
  const {
    initPaymentSheet: initPaymentSheetNative,
    presentPaymentSheet: presentPaymentSheetNative,
    confirmPaymentSheetPayment: confirmPaymentSheetPaymentNative,
    resetPaymentSheetCustomer: resetPaymentSheetCustomerNative,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  const initPaymentSheet = useCallback(
    async (params: PaymentSheet.SetupParams) => {
      setLoading(true);
      const result = await initPaymentSheetNative(params);
      setLoading(false);
      return result;
    },
    [initPaymentSheetNative]
  );

  const presentPaymentSheet = useCallback(
    async (options?: PaymentSheet.PresentOptions) => {
      setLoading(true);
      const result = await presentPaymentSheetNative(options);
      setLoading(false);
      return result;
    },
    [presentPaymentSheetNative]
  );

  const confirmPaymentSheetPayment = useCallback(async () => {
    setLoading(true);
    const result = await confirmPaymentSheetPaymentNative();
    setLoading(false);
    return result;
  }, [confirmPaymentSheetPaymentNative]);

  const resetPaymentSheetCustomer = useCallback(async () => {
    setLoading(true);
    const result = await resetPaymentSheetCustomerNative();
    setLoading(false);
    return result;
  }, [resetPaymentSheetCustomerNative]);

  return {
    loading,
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
    /**
     * You must call this method when the user logs out from your app. This will ensure that
     * any persisted authentication state in the PaymentSheet, such as authentication cookies,
     * is also cleared during logout.
     */
    resetPaymentSheetCustomer,
  };
}
