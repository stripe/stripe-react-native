import { isAndroid, isiOS, createError } from './helpers';
import { MissingRoutingNumber } from './types/Errors';
import NativeStripeSdk from './NativeStripeSdk';
import {
  ApplePay,
  ApplePayError,
  ApplePayResult,
  PlatformPayError,
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
  PlatformPay,
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

/** @deprecated Use `isPlatformPaySupported` instead. */
export const isApplePaySupported = async (): Promise<boolean> => {
  return isiOS && (await NativeStripeSdk.isApplePaySupported());
};

/** @deprecated Use `confirmPlatformPaySetupIntent`, `confirmPlatformPayPayment`, or `createPlatformPayPaymentMethod` instead. */
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

/** @deprecated Use `updatePlatformPaySheet` instead. */
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

/** @deprecated Use `confirmPlatformPaySetupIntent` or `confirmPlatformPayPayment` instead. */
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

/** @deprecated Use `isPlatformPaySupported` instead. */
export const isGooglePaySupported = async (
  params?: GooglePay.IsSupportedParams
): Promise<boolean> => {
  return (
    isAndroid && (await NativeStripeSdk.isGooglePaySupported(params ?? {}))
  );
};

/** @deprecated Use `confirmPlatformPaySetupIntent`, `confirmPlatformPayPayment`, or `createPlatformPayPaymentMethod` instead. */
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

/** @deprecated Use `confirmPlatformPaySetupIntent`, `confirmPlatformPayPayment`, or `createPlatformPayPaymentMethod` instead. */
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

/** @deprecated Use `createPlatformPayPaymentMethod` instead. */
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

/** @deprecated Use `openNativePaySetup` instead. */
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

/**
 * Check if the app & device support adding this card to the native wallet.
 * @param params An object containing fields for `primaryAccountIdentifier`, `cardLastFour`, and `testEnv`.
 *
 * @returns A promise resolving to an object of type CanAddCardToWalletResult. Check the `canAddCard` field, if it's true, you should show the `<AddToWalletButton />`
 */
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

/** @deprecated Please use `canAddCardToWallet` instead. */
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

/**
 * Check if the relevant native wallet (Apple Pay on iOS, Google Pay on Android) is supported.
 * @returns A boolean indicating whether or not the native wallet is supported.
 */
export const isPlatformPaySupported = async (params?: {
  googlePay?: PlatformPay.IsGooglePaySupportedParams;
}): Promise<boolean> => {
  return await NativeStripeSdk.isPlatformPaySupported(params ?? {});
};

/**
 * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [SetupIntent](https://stripe.com/docs/api/setup_intents).
 * @param clientSecret The client secret of the SetupIntent.
 * @param params an object describing the Apple Pay and Google Pay configurations.
 * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `setupIntent` and `paymentMethod` fields.
 */
export const confirmPlatformPaySetupIntent = async (
  clientSecret: string,
  params: PlatformPay.ConfirmParams
): Promise<PlatformPay.ConfirmSetupIntentResult> => {
  try {
    const { error, setupIntent } = (await NativeStripeSdk.confirmPlatformPay(
      clientSecret,
      params,
      false
    )) as PlatformPay.ConfirmSetupIntentResult;
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
 * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [PaymentIntent](https://stripe.com/docs/api/payment_intents).
 * @param clientSecret The client secret of the PaymentIntent.
 * @param params an object describing the Apple Pay and Google Pay configurations.
 * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `paymentIntent` and `paymentMethod` fields.
 */
export const confirmPlatformPayPayment = async (
  clientSecret: string,
  params: PlatformPay.ConfirmParams
): Promise<PlatformPay.ConfirmPaymentResult> => {
  try {
    const { error, paymentIntent } = (await NativeStripeSdk.confirmPlatformPay(
      clientSecret,
      params,
      true
    )) as PlatformPay.ConfirmPaymentResult;
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

/**
 * iOS only, this will always return false on Android. Dismisses the Apple Pay sheet if it is open.
 * @returns A boolean indicating whether or not the sheet was successfully closed. Will return false if the Apple Pay sheet was not open.
 */
export const dismissPlatformPay = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    const didDismiss = await NativeStripeSdk.dismissPlatformPay();
    return didDismiss;
  } catch (error: any) {
    return false;
  }
};

/**
 * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to create a Stripe [PaymentMethod](https://stripe.com/docs/api/payment_methods).
 * @param params an object describing the Apple Pay and Google Pay configurations.
 * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with a `paymentMethod` field.
 */
export const createPlatformPayPaymentMethod = async (
  params: PlatformPay.PaymentMethodParams
): Promise<PlatformPay.PaymentMethodResult> => {
  try {
    const { error, paymentMethod } =
      (await NativeStripeSdk.createPlatformPayPaymentMethod(
        params,
        false
      )) as PlatformPay.PaymentMethodResult;
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

/**
 * @deprecated The Tokens API is deprecated, you should use Payment Methods and `createPlatformPayPaymentMethod` instead.  Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to create a Stripe [token](https://stripe.com/docs/api/tokens).
 * @param params an object describing the Apple Pay and Google Pay configurations.
 * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with a `token` field.
 */
export const createPlatformPayToken = async (
  params: PlatformPay.PaymentMethodParams
): Promise<PlatformPay.TokenResult> => {
  try {
    const { error, token } =
      (await NativeStripeSdk.createPlatformPayPaymentMethod(
        params,
        true
      )) as PlatformPay.TokenResult;
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

/**
 * iOS only. Update different items on the Apple Pay sheet, including the summary items, the shipping methods, and any errors shown. iOS only, this is a no-op on Android.
 * @param params an object describing the Apple Pay configuration, with the following fields:
 * - cartItems An array of payment summary items to display in the Apple Pay sheet.
 * - shippingMethods An array of shipping methods to display in the Apple Pay sheet.
 * - errors An array of errors associated with the user's input that must be corrected to proceed with payment. These errors will be shown in the Apple Pay sheet.
 *
 * @returns An object with an optional 'error' field, which is only populated if something went wrong.
 */
export const updatePlatformPaySheet = async (params: {
  applePay: {
    cartItems: Array<PlatformPay.CartSummaryItem>;
    shippingMethods: Array<PlatformPay.ShippingMethod>;
    errors: Array<PlatformPay.ApplePaySheetError>;
  };
}): Promise<{
  error?: StripeError<PlatformPayError>;
}> => {
  if (Platform.OS !== 'ios') {
    return {};
  }

  try {
    await NativeStripeSdk.updatePlatformPaySheet(
      params.applePay.cartItems,
      params.applePay.shippingMethods,
      params.applePay.errors
    );

    return {};
  } catch (error: any) {
    return {
      error,
    };
  }
};

/**
 * iOS only, this is a no-op on Android. Use this method to move users to the interface for adding credit cards.
 * This method transfers control to the Wallet app on iPhone or to the Settings
 * app on iPad. For devices that don’t support Apple Pay, this method does nothing.
 */
export const openPlatformPaySetup = async (): Promise<void> => {
  if (Platform.OS === 'ios') {
    await NativeStripeSdk.openApplePaySetup();
  }
};
