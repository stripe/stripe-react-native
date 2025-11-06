import type {
  PaymentSheet,
  StripeError,
  CustomerSheetError,
  BillingDetails,
  PaymentMethod,
  CardBrand,
} from '../types';

type CustomerSheetOptionalInitParams = {
  /** The color styling to use for PaymentSheet UI. Defaults to 'automatic'. iOS only. */
  style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
  /** Configuration for the look and feel of the UI. */
  appearance?: PaymentSheet.AppearanceParams;
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
  /** The list of preferred networks that should be used to process payments made with a co-branded card.
   * This value will only be used if your user hasn't selected a network themselves. */
  preferredNetworks?: Array<CardBrand>;
  /** This is an experimental feature that may be removed at any time.
   *  Defaults to true. If true, the customer can delete all saved payment methods.
   *  If false, the customer can't delete if they only have one saved payment method remaining.
   */
  allowsRemovalOfLastSavedPaymentMethod?: boolean;
  /**
   * By default, CustomerSheet will accept all supported cards by Stripe.
   * You can specify card brands CustomerSheet should block or allow payment for by providing an array of those card brands.
   * Note: This is only a client-side solution.
   * Note: Card brand filtering is not currently supported in Link.
   */
  cardBrandAcceptance?: PaymentSheet.CardBrandAcceptance;
};

/**
 * Required params for initializing a CustomerSheet using a legacy CustomerAdapter
 */
type CustomerAdapterInitParams = {
  /** The identifier of the Stripe Customer object. See https://stripe.com/docs/api/customers/object#customer_object-id */
  customerId: string;
  /** Optional but recommended for cards, required for other payment methods. The SetupIntent client secret that will be used to confirm a new payment method. If this is missing, you will only be able to add cards without authentication steps. */
  setupIntentClientSecret?: string;
  /** A short-lived token that allows the SDK to access a Customer's payment methods. */
  customerEphemeralKeySecret: string;
  /** Optional override. It is generally recommended to rely on the default behavior, but- provide a CustomerAdapter here if
   * you would prefer retrieving and updating your Stripe customer object via your own backend instead.
   * WARNING: When implementing your own CustomerAdapter, ensure your application complies with all applicable laws and regulations, including data privacy and consumer protection.
   */
  customerAdapter?: CustomerAdapter;
  intentConfiguration?: never;
  clientSecretProvider?: never;
};

/**
 * Required params for initializing a CustomerSheet with a CustomerSession
 */
type CustomerSessionInitParams = {
  /** An object that configures the intent used to display saved payment methods to a customer.*/
  intentConfiguration: CustomerSheetIntentConfiguration;
  /** An object that provides the client secret for the customer session. */
  clientSecretProvider: ClientSecretProvider;
  customerId?: never;
  setupIntentClientSecret?: never;
  customerEphemeralKeySecret?: never;
  customerAdapter?: never;
};

export type CustomerSheetInitParams = (
  | CustomerAdapterInitParams
  | CustomerSessionInitParams
) &
  CustomerSheetOptionalInitParams;

export type CustomerSheetPresentParams = {
  /** Controls how the modal is presented (after animation). iOS only. Defaults to `popover`. See https://developer.apple.com/documentation/uikit/uimodalpresentationstyle for more info. */
  presentationStyle?:
    | 'fullscreen'
    | 'popover'
    | 'pageSheet'
    | 'formSheet'
    | 'automatic'
    | 'overFullScreen';
  /** Controls how the modal animates. iOS only. */
  animationStyle?: 'flip' | 'curl' | 'slide' | 'dissolve';
  /** Time (in milliseconds) before the Customer Sheet will automatically dismiss. */
  timeout?: number;
};

export type CustomerSheetResult = {
  /** The users selected payment option, if one exists. */
  paymentOption?: PaymentSheet.PaymentOption;
  /** The Stripe PaymentMethod associated with the paymentOption, if it exists. */
  paymentMethod?: PaymentMethod.Result;
  /** The error that occurred. */
  error?: StripeError<CustomerSheetError>;
};

export interface CustomerAdapter {
  /** Retrieves a list of Payment Methods attached to a customer.
   * If you are implementing your own CustomerAdapter:
   * Call the list method ( https://stripe.com/docs/api/payment_methods/list )
   * with the Stripe customer. Return the list of payment methods in JSON format.
   */
  fetchPaymentMethods?(): Promise<Array<object>>;
  /** Adds a Payment Method to a customer.
   * If you are implementing your own CustomerAdapter:
   * On your backend, retrieve the Stripe customer associated with your logged-in user.
   * Then, call the Attach method on the Payment Method with that customer's ID
   * ( https://stripe.com/docs/api/payment_methods/attach ).
   * - Parameters:
   *   - paymentMethod:   A valid Stripe Payment Method ID
   * Return the payment method in JSON format.
   */
  attachPaymentMethod?(paymentMethodId: string): Promise<object>;
  /** Deletes the given Payment Method from the customer.
   * If you are implementing your own CustomerAdapter:
   * Call the Detach method ( https://stripe.com/docs/api/payment_methods/detach )
   * on the Payment Method.
   * - Parameters:
   *   - paymentMethod:   The Stripe Payment Method ID to delete from the customer
   * Return the payment method in JSON format.
   */
  detachPaymentMethod?(paymentMethodId: String): Promise<object>;
  /** Set the last selected payment method for the customer.
   * To unset the default payment method, `null` is passed as the `paymentOption`.
   * If you are implementing your own CustomerAdapter:
   * Save a representation of the passed `paymentOption` as the customer's default payment method.
   */
  setSelectedPaymentOption?(
    paymentOption: CustomerPaymentOption | null
  ): Promise<void>;
  /** Retrieve the last selected payment method for the customer.
   * If you are implementing your own CustomerAdapter:
   * Return a CustomerPaymentOption for the customer's default selected payment method.
   * If no default payment method is selected, return null.
   */
  fetchSelectedPaymentOption?(): Promise<CustomerPaymentOption | null>;
  /** Creates a SetupIntent configured to attach a new payment method to a customer,
   * then returns the client secret for the created SetupIntent.
   */
  setupIntentClientSecretForCustomerAttach?(): Promise<string>;
}

export type CustomerPaymentOption =
  | 'apple_pay'
  | 'google_pay'
  | 'link'
  | string;

export interface ClientSecretProvider {
  /**
   * Provides the `SetupIntent` client secret that is used when attaching a payment method
   * to a customer.
   */
  provideSetupIntentClientSecret(): Promise<string>;

  /**
   * Provides the CustomerSessionClientSecret that will be claimed and used to access a
   * customer's saved payment methods.
   */
  provideCustomerSessionClientSecret(): Promise<CustomerSessionClientSecret>;
}

export type CustomerSheetIntentConfiguration = {
  /** A list of payment method types to display to the customer. If undefined or empty, we dynamically determine the payment methods using your Stripe Dashboard settings. */
  paymentMethodTypes?: Array<string>;
  /** The connected account whose payment method configurations will apply to the CustomerSheet session.
   * Affects the allowed payment methods and whether card brand choice is enabled.
   * When provided, the payment method will be saved to your platform account. See our
   * [SetupIntent docs](https://docs.stripe.com/api/setup_intents/object#setup_intent_object-on_behalf_of)
   * for more information.
   */
  onBehalfOf?: string;
};

export type CustomerSessionClientSecret = {
  /**
   * The Customer the Customer Session was created for.
   */
  customerId: string;
  /**
   * The client secret of this Customer Session.
   * Used on the client to set up secure access to the given customer.
   * See our [CustomerSession docs](https://docs.stripe.com/api/customer_sessions/object)
   * for more information
   */
  clientSecret: string;
};
