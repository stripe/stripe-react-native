import { useCallback, useEffect, useState } from 'react';
import StripeSdk from '../NativeStripeSdk';
import type {
  CartSummaryItem,
  PayWithApplePayError,
  StripeError,
} from '../types';
import { isiOS } from '../platform';

type Params = {
  onError?(error: StripeError<PayWithApplePayError>): void;
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
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess();
    StripeSdk.unregisterApplePayCallbacks();
  }, [onSuccess]);

  const handleError = useCallback(
    (error: StripeError<PayWithApplePayError>) => {
      onError(error);
      StripeSdk.unregisterApplePayCallbacks();
    },
    [onError]
  );

  const registerCallbacks = useCallback(() => {
    if (isiOS) {
      StripeSdk.registerApplePayCallbacks(handleSuccess, handleError);
    }
  }, [handleSuccess, handleError]);

  const payWithApplePay = async (items: CartSummaryItem[]) => {
    registerCallbacks();

    if (!isApplePaySupported) {
      return;
    }
    setLoading(true);
    try {
      await StripeSdk.payWithApplePay(items);
    } catch (e) {
      const error: StripeError<PayWithApplePayError> = e;
      onError(error);
    }
  };

  const completePaymentWithApplePay = async (clientSecret: string) => {
    if (!isApplePaySupported) {
      return;
    }
    await StripeSdk.completePaymentWithApplePay(clientSecret);
    setLoading(false);
  };

  return {
    loading,
    payWithApplePay,
    completePaymentWithApplePay,
    isApplePaySupported,
  };
}
