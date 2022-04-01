import { createError, isAndroid, isiOS } from './helpers';
import { MissingRoutingNumber } from './types/Errors';
import NativeStripeSdk from './NativeStripeSdk';
import {
  ApplePay,
  ApplePayError,
  ApplePayResult,
  ConfirmPaymentResult,
  ConfirmPaymentError,
  ConfirmSetupIntentError,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntent,
  ConfirmSetupIntentResult,
  CreatePaymentMethodResult,
  CreateTokenForCVCUpdateResult,
  CreateTokenResult,
  GooglePayInitResult,
  HandleNextActionResult,
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
  CreateTokenParams,
  VerifyMicrodepositsParams,
  CollectBankAccountParams,
} from './types';

const APPLE_PAY_NOT_SUPPORTED_MESSAGE =
  'Apple pay is not supported on this device';
const PAYMENT_INTENT = 'payment';
const SETUP_INTENT = 'setup';

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
  params: CreateTokenParams
): Promise<CreateTokenResult> => {
  if (
    params.type === 'BankAccount' &&
    params.country?.toLowerCase() === 'us' &&
    !params.routingNumber
  ) {
    return {
      error: MissingRoutingNumber,
    };
  }

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

export const handleNextAction = async (
  paymentIntentClientSecret: string
): Promise<HandleNextActionResult> => {
  try {
    const { paymentIntent, error } = await NativeStripeSdk.handleNextAction(
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

/**
 * @deprecated This method is deprecated, you should use `handleNextAction` as a drop-in replacement instead.
 */
export const handleCardAction = async (
  paymentIntentClientSecret: string
): Promise<HandleNextActionResult> => {
  try {
    const { paymentIntent, error } = await NativeStripeSdk.handleNextAction(
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

export const verifyMicrodepositsForPayment = async (
  clientSecret: string,
  params: VerifyMicrodepositsParams
): Promise<ConfirmPaymentResult> => {
  if (isAndroid) {
    return {
      error: createError({
        code: ConfirmPaymentError.Failed,
        message:
          'verifyMicrodepositsForPayment is only supported on iOS on this version of @stripe/stripe-react-native. Please verify with paymentIntent.nextAction.redirectUrl',
      }),
    };
  }
  try {
    const { paymentIntent, error } = (await NativeStripeSdk.verifyMicrodeposits(
      PAYMENT_INTENT,
      clientSecret,
      params
    )) as ConfirmPaymentResult;

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

export const verifyMicrodepositsForSetup = async (
  clientSecret: string,
  params: VerifyMicrodepositsParams
): Promise<ConfirmSetupIntentResult> => {
  if (isAndroid) {
    return {
      error: createError({
        code: ConfirmSetupIntentError.Failed,
        message:
          'verifyMicrodepositsForSetup is only supported on iOS on this version of @stripe/stripe-react-native. Please verify with setupIntent.nextAction.redirectUrl',
      }),
    };
  }
  try {
    const { setupIntent, error } = (await NativeStripeSdk.verifyMicrodeposits(
      SETUP_INTENT,
      clientSecret,
      params
    )) as ConfirmSetupIntentResult;

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

export const isGooglePaySupported = async (
  params?: GooglePay.IsGooglePaySupportedParams
): Promise<boolean> => {
  return (
    isAndroid && (await NativeStripeSdk.isGooglePaySupported(params ?? {}))
  );
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

export const collectBankAccountForPayment = async (
  clientSecret: string,
  params: CollectBankAccountParams
): Promise<ConfirmPaymentResult> => {
  if (isAndroid) {
    return {
      error: createError({
        code: ConfirmPaymentError.Failed,
        message:
          'collectBankAccountForPayment is only supported on iOS on this version of @stripe/stripe-react-native.',
      }),
    };
  }
  try {
    const { paymentIntent, error } = (await NativeStripeSdk.collectBankAccount(
      PAYMENT_INTENT,
      clientSecret,
      params
    )) as ConfirmPaymentResult;

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

export const collectBankAccountForSetup = async (
  clientSecret: string,
  params: CollectBankAccountParams
): Promise<ConfirmSetupIntentResult> => {
  if (isAndroid) {
    return {
      error: createError({
        code: ConfirmSetupIntentError.Failed,
        message:
          'collectBankAccountForSetup is only supported on iOS on this version of @stripe/stripe-react-native.',
      }),
    };
  }
  try {
    const { setupIntent, error } = (await NativeStripeSdk.collectBankAccount(
      SETUP_INTENT,
      clientSecret,
      params
    )) as ConfirmSetupIntentResult;

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
