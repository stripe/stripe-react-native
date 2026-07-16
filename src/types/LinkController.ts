import type { Result as PaymentMethodResult } from './PaymentMethod';
import type { LinkControllerError, StripeError } from './Errors';

/**
 * @PrivatePreview Payment method types supported by the Link flow.
 */
export enum LinkPaymentMethodType {
  Card = 'card',
  BankAccount = 'bankAccount',
}

/**
 * @PrivatePreview Configuration for initializing the Link controller.
 */
export type Configuration = {
  /** The customer's email address used for Link consumer lookup. */
  email?: string;
  /** Your customer-facing business name, displayed in Link UI. */
  merchantDisplayName: string;
  /** Payment method types to support in the Link sheet. If omitted, all available types are shown. */
  supportedPaymentMethodTypes?: LinkPaymentMethodType[];
  /** Customer phone number in E.164 format to prefill during signup. */
  phoneNumber?: string;
  /** Whether to allow the user to log out. Defaults to true. */
  allowLogout?: boolean;
  /**
   * Optional SetupIntent client secret. When provided, the SDK confirms the SetupIntent
   * with the selected payment method automatically before returning.
   */
  setupIntentClientSecret?: string;
};

/**
 * @PrivatePreview A preview of the payment method the user selected in Link.
 * Intended for display in the host app's checkout UI after the flow completes.
 */
export type PaymentMethodPreview = {
  /**
   * Payment method icon as a data URI PNG string (e.g., "data:image/png;base64,...").
   * Suitable for rendering directly in a React Native `<Image source={{ uri: icon }}>` component.
   */
  icon: string;
  /** The Link label to render in your screen. */
  label: string;
  /** Details about the selected Link payment method. This will typically render the display name of the payment method followed by the last four digits, e.g. `Visa Credit •••• 4242`. */
  sublabel?: string;
};

/**
 * @PrivatePreview Result returned from `initLinkController`.
 */
export type InitResult =
  | { error?: undefined }
  | { error: StripeError<LinkControllerError> };

/**
 * @PrivatePreview Result returned from `presentLinkController`.
 */
export type PresentResult =
  | {
      /** The payment method created from the user's Link selection. */
      paymentMethod: PaymentMethodResult;
      /** A preview of the selected payment method for display purposes. */
      paymentMethodPreview?: PaymentMethodPreview;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      paymentMethodPreview?: undefined;
      /**
       * Set when the operation failed or was canceled.
       * Cancellation has `error.code === LinkControllerError.Canceled`.
       */
      error: StripeError<LinkControllerError>;
    };
