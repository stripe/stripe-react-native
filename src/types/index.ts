import type {
  ApplePayError,
  CardActionError,
  ConfirmPaymentError,
  ConfirmSetupIntentError,
  CreatePaymentMethodError,
  CreateTokenError,
  GooglePayError,
  PaymentSheetError,
  RetrievePaymentIntentError,
  RetrieveSetupIntentError,
  StripeError,
  VerifyMicrodepositsError,
  CollectBankAccountError,
} from './Errors';
import * as ApplePay from './ApplePay';
import * as PaymentIntent from './PaymentIntent';
import * as PaymentMethod from './PaymentMethod';
import * as PaymentSheet from './PaymentSheet';
import * as SetupIntent from './SetupIntent';
import * as ThreeDSecure from './ThreeDSecure';
import * as AuBECSDebitFormComponent from './components/AuBECSDebitFormComponent';
import * as CardFieldInput from './components/CardFieldInput';
import * as CardFormView from './components/CardFormView';
import * as Token from './Token';
import * as FinancialConnections from './FinancialConnections';
import * as PlatformPay from './PlatformPay';

export {
  ApplePay,
  PaymentIntent,
  PaymentMethod,
  PaymentSheet,
  SetupIntent,
  ThreeDSecure,
  AuBECSDebitFormComponent,
  CardFieldInput,
  CardFormView,
  Token,
  FinancialConnections,
  PlatformPay,
};

export * from './PushProvisioning';
export * from './Errors';
export * from './CustomerSheet';
export type { Address, BillingDetails, AddressDetails } from './Common';
export { CardBrand } from './Common';

/**
 * @ignore
 */
export type Dictionary<T> = {
  [key: string]: T;
};

export interface AppInfo {
  name?: string;
  partnerId?: string;
  url?: string;
  version?: string;
}

export type CreatePaymentMethodResult =
  | {
      paymentMethod: PaymentMethod.Result;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      error: StripeError<CreatePaymentMethodError>;
    };

export type RetrievePaymentIntentResult =
  | {
      paymentIntent: PaymentIntent.Result;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<RetrievePaymentIntentError>;
    };

export type RetrieveSetupIntentResult =
  | {
      setupIntent: SetupIntent.Result;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<RetrieveSetupIntentError>;
    };

export type ConfirmPaymentResult =
  | {
      paymentIntent: PaymentIntent.Result;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<ConfirmPaymentError>;
    };

export type HandleNextActionResult =
  | {
      paymentIntent: PaymentIntent.Result;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<CardActionError>;
    };

export type HandleNextActionForSetupResult =
  | {
      setupIntent: SetupIntent.Result;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<CardActionError>;
    };

export type ConfirmSetupIntentResult =
  | {
      setupIntent: SetupIntent.Result;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<ConfirmSetupIntentError>;
    };

export type CreateTokenForCVCUpdateResult =
  | {
      tokenId: string;
      error?: undefined;
    }
  | {
      tokenId?: undefined;
      error: StripeError<ConfirmSetupIntentError>;
    };

export type InitPaymentSheetResult =
  | {
      paymentOption?: PaymentSheet.PaymentOption;
      error?: undefined;
    }
  | {
      paymentOption?: undefined;
      error: StripeError<PaymentSheetError>;
    };

export type PresentPaymentSheetResult = {
  paymentOption?: PaymentSheet.PaymentOption | undefined;
  error?: StripeError<PaymentSheetError> | undefined;
};

export type CreateTokenResult =
  | {
      token: Token.Result;
      error?: undefined;
    }
  | {
      token?: undefined;
      error: StripeError<CreateTokenError>;
    };

export type ConfirmPaymentSheetPaymentResult = {
  error?: StripeError<PaymentSheetError>;
};

export type ApplePayResult =
  | {
      paymentMethod: PaymentMethod.Result;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      error: StripeError<ApplePayError>;
    };

export interface InitStripeParams {
  publishableKey: string;
  stripeAccountId?: string;
  threeDSecureParams?: ThreeDSecure.ConfigurationParams;
  merchantIdentifier?: string;
  urlScheme?: string;
  setReturnUrlSchemeOnAndroid?: boolean;
}

export interface InitialiseParams extends InitStripeParams {
  appInfo: AppInfo;
}

export type GooglePayInitResult =
  | {
      error?: undefined;
    }
  | {
      error: StripeError<GooglePayError>;
    };

export type PayWithGooglePayResult =
  | {
      error?: undefined;
    }
  | {
      error: StripeError<GooglePayError>;
    };

export type CreateGooglePayPaymentMethodResult =
  | {
      paymentMethod: PaymentMethod.Result;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      error: StripeError<GooglePayError>;
    };

export type OpenApplePaySetupResult =
  | {
      error?: undefined;
    }
  | {
      error: StripeError<ApplePayError>;
    };

export type VerifyMicrodepositsParams =
  | {
      amounts: number[];
      descriptorCode?: undefined;
    }
  | {
      amounts?: undefined;
      descriptorCode: string;
    };

export type VerifyMicrodepositsForPaymentResult =
  | {
      paymentIntent: PaymentIntent.Result;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<VerifyMicrodepositsError>;
    };

export type VerifyMicrodepositsForSetupResult =
  | {
      setupIntent: SetupIntent.Result;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<VerifyMicrodepositsError>;
    };

export type CollectBankAccountForPaymentResult =
  | {
      paymentIntent: PaymentIntent.Result;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<CollectBankAccountError>;
    };

export type CollectBankAccountForSetupResult =
  | {
      setupIntent: SetupIntent.Result;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<CollectBankAccountError>;
    };
