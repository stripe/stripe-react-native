import { isAndroid, isiOS, createError } from './helpers';
import { MissingRoutingNumber } from './types/Errors';
import NativeStripeSdk from './NativeStripeSdk';
import {
  ApplePay,
  ApplePayError,
  ApplePayResult,
  ConfirmPaymentResult,
  ConfirmPaymentSheetPaymentResult,
  SetupIntent,
  PaymentIntent,
  ConfirmSetupIntentResult,
  CreatePaymentMethodResult,
  CreateTokenForCVCUpdateResult,
  CreateTokenResult,
  GooglePayInitResult,
  HandleNextActionResult,
  InitPaymentSheetResult,
  PaymentMethod,
  PaymentSheet,
  PayWithGooglePayResult,
  PresentPaymentSheetResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  StripeError,
  GooglePay,
  CreateGooglePayPaymentMethodResult,
  OpenApplePaySetupResult,
  Token,
  VerifyMicrodepositsParams,
  VerifyMicrodepositsForPaymentResult,
  VerifyMicrodepositsForSetupResult,
  CollectBankAccountForPaymentResult,
  CollectBankAccountForSetupResult,
  IsCardInWalletResult,
} from './types';

const APPLE_PAY_NOT_SUPPORTED_MESSAGE =
  'Apple pay is not supported on this device';

export const createPaymentMethod = async (
  params: PaymentMethod.CreateParams,
  options: PaymentMethod.CreateOptions = {}
): Promise<CreatePaymentMethodResult> => {
  try {
    const { paymentMethod, error } = await NativeStripeSdk.createPaymentMethod(
      params,
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
  } catch (error: any) {
    return {
      error,
    };
  }
};

export const createToken = async (
  params: Token.CreateParams
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
  } catch (error: any) {
    return {
      error,
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
  } catch (error: any) {
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
  } catch (error: any) {
    return {
      error,
    };
  }
};

export const confirmPayment = async (
  paymentIntentClientSecret: string,
  params: PaymentIntent.ConfirmParams,
  options: PaymentIntent.ConfirmOptions = {}
): Promise<ConfirmPaymentResult> => {
  try {
    const { paymentIntent, error } = await NativeStripeSdk.confirmPayment(
      paymentIntentClientSecret,
      params,
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
  } catch (error: any) {
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
      error: {
        code: ApplePayError.Canceled,
        message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
      },
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
  } catch (error: any) {
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
      error: {
        code: ApplePayError.Canceled,
        message: APPLE_PAY_NOT_SUPPORTED_MESSAGE,
      },
    };
  }

  try {
    await NativeStripeSdk.updateApplePaySummaryItems(
      summaryItems,
      errorAddressFields
    );

    return {};
  } catch (error: any) {
    return {
      error,
    };
  }
};

export const confirmApplePayPayment = async (
  clientSecret: string
): Promise<{ error?: StripeError<ApplePayError> }> => {
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
  } catch (error: any) {
    return {
      error,
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
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const confirmSetupIntent = async (
  paymentIntentClientSecret: string,
  params: SetupIntent.ConfirmParams,
  options: SetupIntent.ConfirmOptions = {}
): Promise<ConfirmSetupIntentResult> => {
  try {
    const { setupIntent, error } = await NativeStripeSdk.confirmSetupIntent(
      paymentIntentClientSecret,
      params,
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
  } catch (error: any) {
    return {
      error,
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
  } catch (error: any) {
    return {
      error,
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
): Promise<VerifyMicrodepositsForPaymentResult> => {
  try {
    const { paymentIntent, error } = (await NativeStripeSdk.verifyMicrodeposits(
      true,
      clientSecret,
      params
    )) as VerifyMicrodepositsForPaymentResult;

    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent!,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const verifyMicrodepositsForSetup = async (
  clientSecret: string,
  params: VerifyMicrodepositsParams
): Promise<VerifyMicrodepositsForSetupResult> => {
  try {
    const { setupIntent, error } = (await NativeStripeSdk.verifyMicrodeposits(
      false,
      clientSecret,
      params
    )) as VerifyMicrodepositsForSetupResult;

    if (error) {
      return {
        error,
      };
    }
    return {
      setupIntent: setupIntent!,
    };
  } catch (error: any) {
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
  } catch (error: any) {
    return {
      error,
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
        paymentOption: paymentOption!,
      };
    } catch (error: any) {
      return {
        error,
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
    } catch (error: any) {
      return {
        error,
      };
    }
  };

export const isGooglePaySupported = async (
  params?: GooglePay.IsSupportedParams
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
  } catch (error: any) {
    return {
      error,
    };
  }
};

export const presentGooglePay = async (
  params: GooglePay.PresentParams
): Promise<PayWithGooglePayResult> => {
  try {
    const { error } = await NativeStripeSdk.presentGooglePay(params);
    if (error) {
      return {
        error,
      };
    }
    return {};
  } catch (error: any) {
    return {
      error,
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
  } catch (error: any) {
    return {
      error,
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
  } catch (error: any) {
    return {
      error,
    };
  }
};

export const collectBankAccountForPayment = async (
  clientSecret: string,
  params: PaymentMethod.CollectBankAccountParams
): Promise<CollectBankAccountForPaymentResult> => {
  try {
    const { paymentIntent, error } = (await NativeStripeSdk.collectBankAccount(
      true,
      clientSecret,
      params
    )) as CollectBankAccountForPaymentResult;

    if (error) {
      return {
        error,
      };
    }
    return {
      paymentIntent: paymentIntent!,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const collectBankAccountForSetup = async (
  clientSecret: string,
  params: PaymentMethod.CollectBankAccountParams
): Promise<CollectBankAccountForSetupResult> => {
  try {
    const { setupIntent, error } = (await NativeStripeSdk.collectBankAccount(
      false,
      clientSecret,
      params
    )) as CollectBankAccountForSetupResult;

    if (error) {
      return {
        error,
      };
    }
    return {
      setupIntent: setupIntent!,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const isCardInWallet = async (params: {
  cardLastFour: string;
}): Promise<IsCardInWalletResult> => {
  try {
    const { isInWallet, token, error } = await NativeStripeSdk.isCardInWallet(
      params
    );

    if (error) {
      return {
        error,
      };
    }
    return {
      isInWallet: isInWallet as boolean,
      token: token,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const Constants = NativeStripeSdk.getConstants();
