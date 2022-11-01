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
    resetPaymentSheetCustomer: resetPaymentSheetCustomerNative,
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

  const resetPaymentSheetCustomer = async () => {
    setLoading(true);
    const result = await resetPaymentSheetCustomerNative();
    setLoading(false);
    return result;
  };

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
