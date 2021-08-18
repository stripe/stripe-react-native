import type { Card } from './Card';
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
} from './Errors';
import type { PaymentIntent } from './PaymentIntents';
import type { PaymentMethod } from './PaymentMethods';
import type { PaymentSheet } from './PaymentSheet';
import type { SetupIntent } from './SetupIntent';
import type { ThreeDSecureConfigurationParams } from './ThreeDSecure';

export * from './ApplePay';
export * from './PaymentIntents';
export * from './PaymentMethods';
export * from './SetupIntent';
export * from './GooglePay';
export * from './ThreeDSecure';
export * from './components/ApplePayButtonComponent';
export * from './components/AuBECSDebitForm';
export * from './components/CardFieldInput';
export * from './components/CardFormView';
export * from './Card';
export * from './Errors';
export * from './PaymentSheet';

/**
 * @ignore
 */
export type Dictionary<T> = {
  [key: string]: T;
};

/**
 * @ignore
 */
export type Nullable<T> = T | null;

export interface AppInfo {
  name?: string;
  partnerId?: string;
  url?: string;
  version?: string;
}

export type CreatePaymentMethodResult =
  | {
      paymentMethod: PaymentMethod;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      error: StripeError<CreatePaymentMethodError>;
    };

export type RetrievePaymentIntentResult =
  | {
      paymentIntent: PaymentIntent;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<RetrievePaymentIntentError>;
    };

export type RetrieveSetupIntentResult =
  | {
      setupIntent: SetupIntent;
      error?: undefined;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<RetrieveSetupIntentError>;
    };

export type ConfirmPaymentResult =
  | {
      paymentIntent: PaymentIntent;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<ConfirmPaymentError>;
    };

export type HandleCardActionResult =
  | {
      paymentIntent: PaymentIntent;
      error?: undefined;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<CardActionError>;
    };

export type ConfirmSetupIntentResult =
  | {
      setupIntent: SetupIntent;
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

export type PresentPaymentSheetResult =
  | {
      paymentOption?: undefined;
      error?: undefined;
    }
  | {
      paymentOption?: PaymentSheet.PaymentOption;
      error?: undefined;
    }
  | {
      paymentOption?: undefined;
      error: StripeError<PaymentSheetError>;
    };

export type CreateTokenResult =
  | {
      token: Card.Token;
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
      paymentMethod: PaymentMethod;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      error: StripeError<ApplePayError>;
    };

export interface InitStripeParams {
  publishableKey: string;
  stripeAccountId?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  merchantIdentifier?: string;
  urlScheme?: string;
  setUrlSchemeOnAndroid?: boolean;
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
      paymentMethod: PaymentMethod;
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
