import {
  CreatePaymentMethod,
  ApplePayError,
  ApplePay,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  ConfirmPaymentMethodResult,
  HandleCardActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  ApplePayResult,
} from '../types';
import { useCallback, useEffect, useState } from 'react';
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

  const createPaymentMethod = useCallback(
    async (
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
    ): Promise<CreatePaymentMethodResult> => {
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
    },
    []
  );

  const retrievePaymentIntent = useCallback(
    async (clientSecret: string): Promise<RetrievePaymentIntentResult> => {
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
    },
    []
  );

  const confirmPaymentMethod = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options = {}
    ): Promise<ConfirmPaymentMethodResult> => {
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
    },
    []
  );

  const presentApplePay = useCallback(
    async (params: ApplePay.PresentParams): Promise<ApplePayResult> => {
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
    },
    [isApplePaySupported]
  );

  const updateApplePaySummaryItems = useCallback(
    async (
      summaryItems: ApplePay.CartSummaryItem[]
    ): Promise<ApplePayResult> => {
      if (!isApplePaySupported) {
        return {
          error: {
            code: ApplePayError.Canceled,
            message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
          },
        };
      }

      try {
        await NativeStripeSdk.updateApplePaySummaryItems(summaryItems);

        return {
          error: undefined,
        };
      } catch (error) {
        return {
          error: createError(error),
        };
      }
    },
    [isApplePaySupported]
  );

  const confirmApplePayPayment = useCallback(
    async (clientSecret: string): Promise<ApplePayResult> => {
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
    },
    [isApplePaySupported]
  );

  const handleCardAction = useCallback(
    async (
      paymentIntentClientSecret: string
    ): Promise<HandleCardActionResult> => {
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
    },
    []
  );

  const confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: CreatePaymentMethod.Params,
      options: CreatePaymentMethod.Options
    ): Promise<ConfirmSetupIntentResult> => {
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
    },
    []
  );

  const createTokenForCVCUpdate = useCallback(async (cvc: string): Promise<
    CreateTokenForCVCUpdateResult
  > => {
    try {
      const tokenId = await NativeStripeSdk.createTokenForCVCUpdate(cvc);

      return {
        tokenId,
        error: undefined,
      };
    } catch (error) {
      return {
        error: createError(error),
        tokenId: undefined,
      };
    }
  }, []);

  return {
    retrievePaymentIntent: retrievePaymentIntent,
    confirmPayment: confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: handleCardAction,
    isApplePaySupported: isApplePaySupported,
    presentApplePay: presentApplePay,
    confirmApplePayPayment: confirmApplePayPayment,
    confirmSetupIntent: confirmSetupIntent,
    createTokenForCVCUpdate: createTokenForCVCUpdate,
    updateApplePaySummaryItems: updateApplePaySummaryItems,
  };
}
