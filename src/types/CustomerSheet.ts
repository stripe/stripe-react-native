import type {
  PaymentSheet,
  StripeError,
  CustomerSheetError,
  BillingDetails,
  PaymentMethod,
} from '../types';

export type CustomerSheetInitParams = {
  /** The color styling to use for PaymentSheet UI. Defaults to 'automatic'. iOS only. */
  style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
  /** Configuration for the look and feel of the UI. */
  appearance?: PaymentSheet.AppearanceParams;
  /** Optional but recommended for cards, required for other payment methods. The SetupIntent client secret that will be used to confirm a new payment method. If this is missing, you will only be able to add cards without authentication steps. */
  setupIntentClientSecret?: string;
  /** The identifier of the Stripe Customer object. See https://stripe.com/docs/api/customers/object#customer_object-id */
  customerId: string;
  /** A short-lived token that allows the SDK to access a Customer's payment methods. */
  customerEphemeralKeySecret: string;
  /** Your customer-facing business name. The default value is the name of your app. */
  merchantDisplayName?: string;
  /** Optional configuration for setting the header text of the Payment Method selection screen */
  headerTextForSelectionScreen?: string;
  /** CustomerSheet pre-populates fields with the values provided. If `billingDetailsCollectionConfiguration.attachDefaultsToPaymentMethod` is `true`, these values will be attached to the payment method even if they are not collected by the CustomerSheet UI. */
  defaultBillingDetails?: BillingDetails;
  /** Describes how billing details should be collected. All values default to `AUTOMATIC`. If `NEVER` is used for a required field for the Payment Method, you must provide an appropriate value as part of `defaultBillingDetails`. */
  billingDetailsCollectionConfiguration?: PaymentSheet.BillingDetailsCollectionConfiguration;
  /** A URL that redirects back to your app that CustomerSheet can use to auto-dismiss web views used for additional authentication, e.g. 3DS2 */
  returnURL?: string;
  /** Optional configuration to display a custom message when a saved payment method is removed. iOS only. */
  removeSavedPaymentMethodMessage?: string;
  /** Whether to show Apple Pay as an option. Defaults to false. */
  applePayEnabled?: boolean;
  /** Whether to show Google Pay as an option. Defaults to false. */
  googlePayEnabled?: boolean;
  /** TODO */
  customerAdapter?: any;
};

export type CustomerSheetPresentParams = {
  /** Controls how the modal is presented (after animation). iOS only. Defaults to `popover`. */
  presentationStyle?: 'fullscreen' | 'popover';
  /** Controls how the modal animates. iOS only. */
  animationStyle?: 'flip' | 'curl' | 'slide' | 'dissolve';
  /** Time (in milliseconds) before the Customer Sheet will automatically dismiss. */
  timeout?: number;
};

export type CustomerSheetResult = {
  paymentOption?: PaymentSheet.PaymentOption;
  paymentMethod?: PaymentMethod.Result;
  error?: StripeError<CustomerSheetError>;
};
