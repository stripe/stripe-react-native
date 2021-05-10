import { createError, isiOS } from './helpers';
import NativeStripeSdk from './NativeStripeSdk';
import {
  ApplePay,
  ApplePayError,
  ApplePayResult,
  ConfirmPaymentMethodResult,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntent,
  ConfirmSetupIntentResult,
  CreatePaymentMethodResult,
  CreateTokenForCVCUpdateResult,
  HandleCardActionResult,
  InitPaymentSheetResult,
  PaymentMethodCreateParams,
  PaymentSheet,
  PresentPaymentSheetResult,
  RetrievePaymentIntentResult,
} from './types';

const APPLE_PAY_NOT_SUPPORTED_MESSAGE =
  'Apple pay is not supported on this device';

export const createPaymentMethod = async (
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
};

export const retrievePaymentIntent = async (
  clientSecret: string
): Promise<RetrievePaymentIntentResult> => {
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
};

export const confirmPaymentMethod = async (
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
};

export const isApplePaySupported = async (): Promise<boolean> => {
  return isiOS && (await NativeStripeSdk.isApplePaySupported());
};

export const presentApplePay = async (
  params: ApplePay.PresentParams
): Promise<ApplePayResult> => {
  if (!(await NativeStripeSdk.isApplePaySupported())) {
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
};

export const updateApplePaySummaryItems = async (
  summaryItems: ApplePay.CartSummaryItem[]
): Promise<ApplePayResult> => {
  if (!(await NativeStripeSdk.isApplePaySupported())) {
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
};

export const confirmApplePayPayment = async (
  clientSecret: string
): Promise<ApplePayResult> => {
  if (!(await NativeStripeSdk.isApplePaySupported())) {
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
};

export const handleCardAction = async (
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
};

export const confirmSetupIntent = async (
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
};

export const createTokenForCVCUpdate = async (
  cvc: string
): Promise<CreateTokenForCVCUpdateResult> => {
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
};

export const handleURLCallback = async (url: string): Promise<boolean> => {
  const stripeHandled = await NativeStripeSdk.handleURLCallback(url);
  return stripeHandled;
};

export const initPaymentSheet = async (
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
};

export const presentPaymentSheet = async (
  params: PaymentSheet.PresentParams
): Promise<PresentPaymentSheetResult> => {
  try {
    const response = await NativeStripeSdk.presentPaymentSheet(params);

    return {
      paymentOption: response.paymentOption,
    };
  } catch (error) {
    return {
      error: createError(error),
    };
  }
};

export const confirmPaymentSheetPayment = async (): Promise<ConfirmPaymentSheetPaymentResult> => {
  try {
    await NativeStripeSdk.confirmPaymentSheetPayment();

    return {};
  } catch (error) {
    return {
      error: createError(error),
    };
  }
};
