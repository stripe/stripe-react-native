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
  CreateTokenResult,
  HandleCardActionResult,
  InitPaymentSheetResult,
  PaymentIntent,
  PaymentMethod,
  PaymentMethodCreateParams,
  PaymentSheet,
  PresentPaymentSheetResult,
  RetrievePaymentIntentResult,
  SetupIntent,
} from './types';
import type { Card } from './types/Card';

const APPLE_PAY_NOT_SUPPORTED_MESSAGE =
  'Apple pay is not supported on this device';

export const createPaymentMethod = async (
  data: PaymentMethodCreateParams.Params,
  options: PaymentMethodCreateParams.Options = {}
): Promise<CreatePaymentMethodResult> => {
  try {
    const { paymentMethod, error } = await NativeStripeSdk.createPaymentMethod(
      data,
      options
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentMethod: paymentMethod as PaymentMethod,
    };
  } catch (error) {
    return {
      error,
    };
  }
};

export const createToken = async (
  params: Card.CreateTokenParams
): Promise<CreateTokenResult> => {
  try {
    const token = await NativeStripeSdk.createToken(params);
    return {
      token,
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
    const {
      paymentIntent,
      error,
    } = await NativeStripeSdk.retrievePaymentIntent(clientSecret);
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent as PaymentIntent,
    };
  } catch (error) {
    return {
      error,
    };
  }
};

export const confirmPaymentMethod = async (
  paymentIntentClientSecret: string,
  data: PaymentMethodCreateParams.Params,
  options: PaymentMethodCreateParams.Options = {}
): Promise<ConfirmPaymentMethodResult> => {
  try {
    const { paymentIntent, error } = await NativeStripeSdk.confirmPaymentMethod(
      paymentIntentClientSecret,
      data,
      options
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent as PaymentIntent,
    };
  } catch (error) {
    return {
      error,
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
      error: createError({
        code: ApplePayError.Canceled,
        message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
      }),
    };
  }

  try {
    await NativeStripeSdk.presentApplePay(params);

    return {};
  } catch (error) {
    return {
      error,
    };
  }
};

export const updateApplePaySummaryItems = async (
  summaryItems: ApplePay.CartSummaryItem[],
  errorAddressFields: Array<{
    field: ApplePay.AddressFields;
    message?: string;
  }> = []
): Promise<ApplePayResult> => {
  if (!(await NativeStripeSdk.isApplePaySupported())) {
    return {
      error: createError({
        code: ApplePayError.Canceled,
        message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
      }),
    };
  }

  try {
    await NativeStripeSdk.updateApplePaySummaryItems(
      summaryItems,
      errorAddressFields
    );

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
      error: createError({
        code: ApplePayError.Canceled,
        message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
      }),
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
    const { paymentIntent, error } = await NativeStripeSdk.handleCardAction(
      paymentIntentClientSecret
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent as PaymentIntent,
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
    const { setupIntent, error } = await NativeStripeSdk.confirmSetupIntent(
      paymentIntentClientSecret,
      data,
      options
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      setupIntent: setupIntent as SetupIntent,
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
    const { tokenId, error } = await NativeStripeSdk.createTokenForCVCUpdate(
      cvc
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      tokenId: tokenId as string,
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
    const { paymentOption, error } = await NativeStripeSdk.initPaymentSheet(
      params
    );
    if (error) {
      return {
        error,
      };
    }
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
    const { paymentOption, error } = await NativeStripeSdk.presentPaymentSheet(
      params
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentOption: paymentOption,
    };
  } catch (error) {
    return {
      error: createError(error),
    };
  }
};

export const confirmPaymentSheetPayment = async (): Promise<ConfirmPaymentSheetPaymentResult> => {
  try {
    const { error } = await NativeStripeSdk.confirmPaymentSheetPayment();
    if (error) {
      return {
        error,
      };
    }
    return {};
  } catch (error) {
    return {
      error: createError(error),
    };
  }
};
