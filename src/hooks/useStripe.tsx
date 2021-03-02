import {
  CreatePaymentMethod,
  PaymentMethod,
  StripeError,
  CreatePaymentMethodError,
  PaymentIntent,
  ConfirmPaymentError,
  RetrievePaymentIntentError,
  ApplePayError,
  CardActionError,
  SetupIntent,
  ConfirmSetupIntentError,
  ApplePay,
} from '../types';
import { useEffect, useState } from 'react';
import { isiOS, createError } from '../helpers';
import NativeStripeSdk from '../NativeStripeSdk';
import StripeSdk from '../NativeStripeSdk';

const APPLE_PAY_NOT_SUPPORTED_MESSAGE =
  'Apple pay is not supported on this device';

/**
 * useStripe hook
 */
export function useStripe() {
  const [isApplePaySupported, setApplePaySupported] = useState(false);

  useEffect(() => {
    async function checkApplePaySupport() {
      const isSupported = isiOS ?? (await StripeSdk.isApplePaySupported());
      setApplePaySupported(isSupported);
    }

    checkApplePaySupport();
  }, []);

  const createPaymentMethod = async (
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options = {}
  ): Promise<{
    paymentMethod?: PaymentMethod;
    error?: StripeError<CreatePaymentMethodError>;
  }> => {
    try {
      const paymentMethod = await NativeStripeSdk.createPaymentMethod(
        data,
        options
      );
      return {
        paymentMethod,
        error: undefined,
      };
    } catch (error) {
      return {
        paymentMethod: undefined,
        error: createError(error),
      };
    }
  };

  const retrievePaymentIntent = async (
    clientSecret: string
  ): Promise<{
    paymentIntent?: PaymentIntent;
    error?: StripeError<RetrievePaymentIntentError>;
  }> => {
    try {
      const paymentIntent = await NativeStripeSdk.retrievePaymentIntent(
        clientSecret
      );
      return {
        paymentIntent,
        error: undefined,
      };
    } catch (error) {
      return {
        paymentIntent: undefined,
        error: createError(error),
      };
    }
  };

  const confirmPaymentMethod = async (
    paymentIntentClientSecret: string,
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<{
    paymentIntent?: PaymentIntent;
    error?: StripeError<ConfirmPaymentError>;
  }> => {
    try {
      const paymentIntent = await NativeStripeSdk.confirmPaymentMethod(
        paymentIntentClientSecret,
        data,
        options
      );
      return {
        paymentIntent,
        error: undefined,
      };
    } catch (error) {
      return {
        paymentIntent: undefined,
        error: createError(error),
      };
    }
  };

  const presentApplePay = async (
    params: ApplePay.PresentParams
  ): Promise<{ error?: StripeError<ApplePayError> }> => {
    if (!isApplePaySupported) {
      return {
        error: {
          code: ApplePayError.Canceled,
          message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
        },
      };
    }

    try {
      await NativeStripeSdk.presentApplePay(params);

      return {
        error: undefined,
      };
    } catch (error) {
      return {
        error: createError(error),
      };
    }
  };

  const confirmApplePayPayment = async (
    clientSecret: string
  ): Promise<{ error?: StripeError<ApplePayError> }> => {
    if (!isApplePaySupported) {
      return {
        error: {
          code: ApplePayError.Canceled,
          message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
        },
      };
    }
    try {
      await NativeStripeSdk.confirmApplePayPayment(clientSecret);
      return {
        error: undefined,
      };
    } catch (error) {
      return {
        error: createError(error),
      };
    }
  };

  const handleCardAction = async (
    paymentIntentClientSecret: string
  ): Promise<{
    paymentIntent?: PaymentIntent;
    error?: StripeError<CardActionError>;
  }> => {
    try {
      const paymentIntent = await NativeStripeSdk.handleCardAction(
        paymentIntentClientSecret
      );
      return {
        paymentIntent,
        error: undefined,
      };
    } catch (error) {
      return {
        error: createError(error),
        paymentIntent: undefined,
      };
    }
  };

  const confirmSetupIntent = async (
    paymentIntentClientSecret: string,
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options
  ): Promise<{
    setupIntent?: SetupIntent;
    error?: StripeError<ConfirmSetupIntentError>;
  }> => {
    try {
      const setupIntent = await NativeStripeSdk.confirmSetupIntent(
        paymentIntentClientSecret,
        data,
        options
      );

      return {
        setupIntent,
        error: undefined,
      };
    } catch (error) {
      return {
        error: createError(error),
        setupIntent: undefined,
      };
    }
  };

  return {
    retrievePaymentIntent: retrievePaymentIntent,
    confirmPayment: confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: handleCardAction,
    isApplePaySupported: isApplePaySupported,
    presentApplePay: presentApplePay,
    confirmApplePayPayment: confirmApplePayPayment,
    confirmSetupIntent: confirmSetupIntent,
  };
}
