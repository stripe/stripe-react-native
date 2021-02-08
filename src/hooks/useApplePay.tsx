import { useCallback, useState } from 'react';
import StripeSdk from '../NativeStripeSdk';
import type {
  PresentApplePayParams,
  PresentApplePayError,
  StripeError,
} from '../types';
import { useStripe } from './useStripe';

interface Params {
  onError?(error: StripeError<PresentApplePayError>): void;
  onSuccess?(): void;
}

export function useApplePay({
  onSuccess = () => {},
  onError = () => {},
}: Params = {}) {
  const { isApplePaySupported } = useStripe();
  const [loading, setLoading] = useState(false);

  const handleSuccess = useCallback(() => {
    onSuccess();
    StripeSdk.unregisterApplePayCallbacks();
  }, [onSuccess]);

  const handleError = useCallback(
    (error: StripeError<PresentApplePayError>) => {
      onError(error);
      StripeSdk.unregisterApplePayCallbacks();
    },
    [onError]
  );

  const registerCallbacks = useCallback(() => {
    StripeSdk.registerApplePayCallbacks(handleSuccess, handleError);
  }, [handleSuccess, handleError]);

  const presentApplePay = async (data: PresentApplePayParams) => {
    if (!isApplePaySupported) {
      return;
    }
    registerCallbacks();

    setLoading(true);
    try {
      await StripeSdk.presentApplePay(data);
    } catch (e) {
      const error: StripeError<PresentApplePayError> = e;
      onError(error);
    }
  };

  const confirmApplePayPayment = async (clientSecret: string) => {
    if (!isApplePaySupported) {
      return;
    }
    await StripeSdk.confirmApplePayPayment(clientSecret);
    setLoading(false);
  };

  return {
    loading,
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  };
}
