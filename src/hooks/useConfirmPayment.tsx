import { useCallback, useState } from 'react';
import type {
  BillingDetails,
  CardDetails,
  ConfirmPaymentError,
  PaymentIntent,
  StripeError,
} from '../types';
import StripeSdk from '../NativeStripeSdk';
import { createHandler } from '../helpers';

type Params = {
  onError: (error: StripeError<ConfirmPaymentError>) => void;
  onSuccess: (intent: PaymentIntent) => void;
};

export function useConfirmPayment({ onError, onSuccess }: Params) {
  const [loading, setLoading] = useState(false);

  const handleFinishCallback = useCallback(() => {
    setLoading(false);
    StripeSdk.unregisterConfirmPaymentCallbacks();
  }, []);

  const confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      billingDetails: BillingDetails,
      cardDetails: CardDetails
    ) => {
      const handleSuccess = createHandler((value: PaymentIntent) => {
        onSuccess(value);
        handleFinishCallback();
      });

      const handleError = createHandler(
        (value: StripeError<ConfirmPaymentError>) => {
          onError(value);
          handleFinishCallback();
        }
      );

      StripeSdk.registerConfirmPaymentCallbacks(handleSuccess, handleError);

      setLoading(true);
      const result = await StripeSdk.confirmPaymentMethod(
        paymentIntentClientSecret,
        billingDetails,
        cardDetails
      );
      setLoading(false);

      return result;
    },
    [handleFinishCallback, onSuccess, onError]
  );

  return {
    confirmPayment,
    loading,
  };
}
