import { useEffect, useState } from 'react';
import StripeSdk from '../NativeStripeSdk';
import type { CartSummaryItem } from '../types';
import { isiOS } from '../platform';

type Params = {
  onError?(errorCode: string, errorMessage: string): void;
  onSuccess?(): void;
};

export function useApplePay({
  onSuccess = () => {},
  onError = () => {},
}: Params = {}) {
  const [loading, setLoading] = useState(false);
  const [isApplePaySupported, setApplePaySupported] = useState(false);

  useEffect(() => {
    async function checkApplePaySupport() {
      const isSupported = isiOS ?? (await StripeSdk.isApplePaySupported());
      setApplePaySupported(isSupported);
    }

    checkApplePaySupport();

    if (isiOS) {
      StripeSdk.registerApplePayCallbacks(onSuccess, onError);
    }
  }, [onSuccess, onError]);

  const payWithApplePay = async (items: CartSummaryItem[]) => {
    if (!isApplePaySupported) {
      return;
    }
    setLoading(true);
    await StripeSdk.payWithApplePay(items);
  };

  const completePaymentWithApplePay = (clientSecret: string) => {
    if (!isApplePaySupported) {
      return;
    }
    StripeSdk.completePaymentWithApplePay(clientSecret);
    setLoading(false);
  };

  return {
    loading,
    payWithApplePay,
    completePaymentWithApplePay,
    isApplePaySupported,
  };
}
