import {
  PaymentMethodCreateParams,
  ApplePayError,
  ApplePay,
  PaymentSheet,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  ConfirmPaymentMethodResult,
  HandleCardActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  ApplePayResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntent,
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
      data: PaymentMethodCreateParams.Params,
      options: PaymentMethodCreateParams.Options = {}
    ): Promise<CreatePaymentMethodResult> => {
      try {
        const paymentMethod = await NativeStripeSdk.createPaymentMethod(
          data,
          options
        );
        return {
          paymentMethod,
        };
      } catch (error) {
        return {
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
        };
      } catch (error) {
        return {
          error: createError(error),
        };
      }
    },
    []
  );

  const confirmPaymentMethod = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: PaymentMethodCreateParams.Params,
      options: PaymentMethodCreateParams.Options = {}
    ): Promise<ConfirmPaymentMethodResult> => {
      try {
        const paymentIntent = await NativeStripeSdk.confirmPaymentMethod(
          paymentIntentClientSecret,
          data,
          options
        );
        return {
          paymentIntent,
        };
      } catch (error) {
        return {
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

        return {};
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

        return {};
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
        return {};
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
        };
      } catch (error) {
        return {
          error: createError(error),
        };
      }
    },
    []
  );

  const confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: ConfirmSetupIntent.Params,
      options: ConfirmSetupIntent.Options = {}
    ): Promise<ConfirmSetupIntentResult> => {
      try {
        const setupIntent = await NativeStripeSdk.confirmSetupIntent(
          paymentIntentClientSecret,
          data,
          options
        );

        return {
          setupIntent,
        };
      } catch (error) {
        return {
          error: createError(error),
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
      };
    } catch (error) {
      return {
        error: createError(error),
      };
    }
  }, []);

  const initPaymentSheet = useCallback(
    async (
      params: PaymentSheet.SetupParams
    ): Promise<InitPaymentSheetResult> => {
      try {
        const paymentOption = await NativeStripeSdk.initPaymentSheet(params);

        return {
          paymentOption,
        };
      } catch (error) {
        return {
          error: createError(error),
        };
      }
    },
    []
  );

  const presentPaymentSheet = useCallback(
    async (
      params: PaymentSheet.PresentParams
    ): Promise<PresentPaymentSheetResult> => {
      try {
        const response = await NativeStripeSdk.presentPaymentSheet(params);

        if (response.paymentIntent) {
          return {
            paymentIntent: response.paymentIntent,
          };
        } else {
          return {
            paymentOption: response.paymentOption,
          };
        }
      } catch (error) {
        return {
          error: createError(error),
        };
      }
    },
    []
  );

  const confirmPaymentSheetPayment = useCallback(async (): Promise<
    ConfirmPaymentSheetPaymentResult
  > => {
    try {
      const {
        paymentIntent,
      } = await NativeStripeSdk.confirmPaymentSheetPayment();

      return {
        paymentIntent,
      };
    } catch (error) {
      return {
        error: createError(error),
      };
    }
  }, []);

  const handleURLCallback = useCallback(async (url: string): Promise<
    boolean
  > => {
    const stripeHandled = await NativeStripeSdk.handleURLCallback(url);
    return stripeHandled;
  }, []);

  return {
    retrievePaymentIntent: retrievePaymentIntent,
    confirmPayment: confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: handleCardAction,
    isApplePaySupported: isApplePaySupported,
    initPaymentSheet: initPaymentSheet,
    presentPaymentSheet: presentPaymentSheet,
    confirmPaymentSheetPayment: confirmPaymentSheetPayment,
    presentApplePay: presentApplePay,
    confirmApplePayPayment: confirmApplePayPayment,
    confirmSetupIntent: confirmSetupIntent,
    createTokenForCVCUpdate: createTokenForCVCUpdate,
    updateApplePaySummaryItems: updateApplePaySummaryItems,
    handleURLCallback: handleURLCallback,
  };
}
