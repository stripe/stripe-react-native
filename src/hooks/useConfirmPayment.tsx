import { useCallback, useState } from 'react';
import type {
  ConfirmPaymentError,
  CreatePaymentMethod,
  PaymentIntent,
  StripeError,
} from '@stripe/stripe-react-native';
import StripeSdk from '../NativeStripeSdk';
import { createHandler } from '../helpers';
import { useStripe } from './useStripe';

type Params = {
  onError: (error: StripeError<ConfirmPaymentError>) => void;
  onSuccess: (intent: PaymentIntent) => void;
};

export function useConfirmPayment({ onError, onSuccess }: Params) {
  const [loading, setLoading] = useState(false);
  const { confirmPayment: confirmPaymentMethod } = useStripe();

  const handleFinishCallback = useCallback(() => {
    setLoading(false);
    StripeSdk.unregisterConfirmPaymentCallbacks();
  }, []);

  const confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
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
      const result = await confirmPaymentMethod(
        paymentIntentClientSecret,
        data,
        options
      );
      setLoading(false);

      return result;
    },
    [handleFinishCallback, onSuccess, onError, confirmPaymentMethod]
  );

  return {
    confirmPayment,
    loading,
  };
}
