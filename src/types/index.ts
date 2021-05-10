import type {
  ApplePayError,
  CardActionError,
  ConfirmPaymentError,
  ConfirmSetupIntentError,
  CreatePaymentMethodError,
  PaymentSheetError,
  RetrievePaymentIntentError,
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
export * from './ThreeDSecure';
export * from './components/ApplePayButtonComponent';
export * from './components/AuBECSDebitForm';
export * from './components/CardFieldInput';
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

export type ConfirmPaymentMethodResult =
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

export type ConfirmPaymentSheetPaymentResult = {
  error?: StripeError<PaymentSheetError>;
};

export type ApplePayResult = { error?: StripeError<ApplePayError> };

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
