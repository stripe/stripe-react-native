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
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  FinancialConnections,
} from './types';
import { Platform } from 'react-native';

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

/**
 * Confirm and, if necessary, authenticate a PaymentIntent.
 *
 * @param {string} paymentIntentClientSecret The client_secret of the associated [PaymentIntent](https://stripe.com/docs/api/payment_intents).
 * @param {object=} params An optional object that contains data related to the payment method used to confirm this payment. If no object is provided (undefined), then it is assumed that the payment method has already been [attached  to the Payment Intent](https://stripe.com/docs/api/payment_intents/create#create_payment_intent-payment_method).
 * @param {object=} options An optional object that contains options for this payment method.
 * @returns A promise that resolves to an object containing either a `paymentIntent` field, or an `error` field.
 */
export const confirmPayment = async (
  paymentIntentClientSecret: string,
  params?: PaymentIntent.ConfirmParams,
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

/** Handles any nextAction required to authenticate the PaymentIntent.
 * Call this method if you are using manual confirmation. See https://stripe.com/docs/payments/accept-a-payment?platform=react-native&ui=custom
 *
 * @param {string} paymentIntentClientSecret The client secret associated with the PaymentIntent.
 * @param {string=} returnURL An optional return URL so the Stripe SDK can redirect back to your app after authentication. This should match the `return_url` you specified during PaymentIntent confirmation.
 * */
export const handleNextAction = async (
  paymentIntentClientSecret: string,
  returnURL?: string
): Promise<HandleNextActionResult> => {
  try {
    const { paymentIntent, error } =
      Platform.OS === 'ios'
        ? await NativeStripeSdk.handleNextAction(
            paymentIntentClientSecret,
            returnURL ?? null
          )
        : await NativeStripeSdk.handleNextAction(paymentIntentClientSecret);
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

/**
 * You must call this method when the user logs out from your app. This will ensure that
 * any persisted authentication state in the PaymentSheet, such as authentication cookies,
 * is also cleared during logout.
 */
export const resetPaymentSheetCustomer = async (): Promise<null> => {
  return await NativeStripeSdk.resetPaymentSheetCustomer();
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

/**
 * Use collectBankAccountToken in the [Add a Financial Connections Account to a US Custom Connect](https://stripe.com/docs/financial-connections/connect-payouts) account flow.
 * When called, it will load the Authentication Flow, an on-page modal UI which allows your user to securely link their external financial account for payouts.
 * @param {string} clientSecret The client_secret of the [Financial Connections Session](https://stripe.com/docs/api/financial_connections/session).
 * @returns A promise that resolves to an object containing either `session` and `token` fields, or an error field.
 */
export const collectBankAccountToken = async (
  clientSecret: string
): Promise<FinancialConnections.TokenResult> => {
  try {
    const { session, token, error } =
      await NativeStripeSdk.collectBankAccountToken(clientSecret);

    if (error) {
      return {
        error,
      };
    }
    return {
      session: session!,
      token: token!,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

/**
 * Use collectFinancialConnectionsAccounts in the [Collect an account to build data-powered products](https://stripe.com/docs/financial-connections/other-data-powered-products) flow.
 * When called, it will load the Authentication Flow, an on-page modal UI which allows your user to securely link their external financial account.
 * @param {string} clientSecret The client_secret of the [Financial Connections Session](https://stripe.com/docs/api/financial_connections/session).
 * @returns A promise that resolves to an object containing either a `session` field, or an error field.
 */
export const collectFinancialConnectionsAccounts = async (
  clientSecret: string
): Promise<FinancialConnections.SessionResult> => {
  try {
    const { session, error } =
      await NativeStripeSdk.collectFinancialConnectionsAccounts(clientSecret);

    if (error) {
      return {
        error,
      };
    }
    return {
      session: session!,
    };
  } catch (error: any) {
    return {
      error: createError(error),
    };
  }
};

export const canAddCardToWallet = async (
  params: CanAddCardToWalletParams
): Promise<CanAddCardToWalletResult> => {
  try {
    const { canAddCard, details, error } =
      await NativeStripeSdk.canAddCardToWallet(params);

    if (error) {
      return {
        error,
      };
    }
    return {
      canAddCard: canAddCard as boolean,
      details: details,
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
