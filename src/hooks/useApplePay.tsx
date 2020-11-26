import StripeSdk from '../NativeStripeSdk';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { CartSummaryItem } from 'src/types';

type Params = {
  onError: (errorCode: string, errorMessage: string) => void;
  onSuccess: () => void;
};

export function useApplePay({ onSuccess, onError }: Params) {
  const [loading, setLoading] = useState(false);
  const [isApplePaySupported, setApplePaySupported] = useState(false);

  useEffect(() => {
    async function checkApplePaySupport() {
      const isSupported =
        Platform.OS === 'ios' ?? (await StripeSdk.isApplePaySupported());
      setApplePaySupported(isSupported);
    }

    checkApplePaySupport();

    StripeSdk.registerApplePayCallbacks(onSuccess, onError);
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
