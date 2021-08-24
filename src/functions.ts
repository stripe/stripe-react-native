import { createError, isiOS } from './helpers';
import NativeStripeSdk from './NativeStripeSdk';
import {
  ApplePay,
  ApplePayError,
  ApplePayResult,
  ConfirmPaymentResult,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntent,
  ConfirmSetupIntentResult,
  CreatePaymentMethodResult,
  CreateTokenForCVCUpdateResult,
  CreateTokenResult,
  GooglePayInitResult,
  HandleCardActionResult,
  InitPaymentSheetResult,
  PaymentMethodCreateParams,
  PaymentSheet,
  PayWithGooglePayResult,
  PresentPaymentSheetResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  StripeError,
  GooglePay,
  CreateGooglePayPaymentMethodResult,
  OpenApplePaySetupResult,
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
      paymentMethod: paymentMethod!,
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
    const { token, error } = await NativeStripeSdk.createToken(params);

    if (error) {
      return {
        error,
      };
    }
    return {
      token: token!,
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
    const { paymentIntent, error } =
      await NativeStripeSdk.retrievePaymentIntent(clientSecret);
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent!,
    };
  } catch (error) {
    return {
      error,
    };
  }
};

export const retrieveSetupIntent = async (
  clientSecret: string
): Promise<RetrieveSetupIntentResult> => {
  try {
    const { setupIntent, error } = await NativeStripeSdk.retrieveSetupIntent(
      clientSecret
    );
    if (error) {
      return {
        error,
      };
    }
    return {
      setupIntent: setupIntent!,
    };
  } catch (error) {
    return {
      error,
    };
  }
};

export const confirmPayment = async (
  paymentIntentClientSecret: string,
  data: PaymentMethodCreateParams.Params,
  options: PaymentMethodCreateParams.Options = {}
): Promise<ConfirmPaymentResult> => {
  try {
    const { paymentIntent, error } = await NativeStripeSdk.confirmPayment(
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
      paymentIntent: paymentIntent!,
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
    const { paymentMethod, error } = await NativeStripeSdk.presentApplePay(
      params
    );
    if (error) {
      return {
        error,
      };
    }
    return { paymentMethod: paymentMethod! };
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
): Promise<{ error?: StripeError<ApplePayError> }> => {
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
): Promise<{ error?: StripeError<ApplePayError> }> => {
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
      paymentIntent: paymentIntent!,
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
      setupIntent: setupIntent!,
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
      tokenId: tokenId!,
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

export const presentPaymentSheet =
  async (): Promise<PresentPaymentSheetResult> => {
    try {
      const { paymentOption, error } =
        await NativeStripeSdk.presentPaymentSheet();
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

export const confirmPaymentSheetPayment =
  async (): Promise<ConfirmPaymentSheetPaymentResult> => {
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

export const initGooglePay = async (
  params: GooglePay.InitParams
): Promise<GooglePayInitResult> => {
  try {
    const { error } = await NativeStripeSdk.initGooglePay(params);
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

export const presentGooglePay = async (
  params: GooglePay.SetupIntentParams
): Promise<PayWithGooglePayResult> => {
  try {
    const { error } = await NativeStripeSdk.presentGooglePay(params);
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

export const createGooglePayPaymentMethod = async (
  params: GooglePay.CreatePaymentMethodParams
): Promise<CreateGooglePayPaymentMethodResult> => {
  try {
    const { error, paymentMethod } =
      await NativeStripeSdk.createGooglePayPaymentMethod(params);
    if (error) {
      return {
        error,
      };
    }
    return {
      paymentMethod: paymentMethod!,
    };
  } catch (error) {
    return {
      error: createError(error),
    };
  }
};

export const openApplePaySetup = async (): Promise<OpenApplePaySetupResult> => {
  try {
    const { error } = await NativeStripeSdk.openApplePaySetup();
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
