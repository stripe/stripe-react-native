import type { BillingDetails, AddressDetails } from './Common';
import type { CartSummaryItem } from './ApplePay';
import type {
  ButtonType,
  RecurringPaymentRequest,
  AutomaticReloadPaymentRequest,
  MultiMerchantRequest,
} from './PlatformPay';
import type { FutureUsage } from './PaymentIntent';
import type { Result } from './PaymentMethod';
import type { StripeError } from './Errors';

export type SetupParams = IntentParams & {
  /** Your customer-facing business name. On Android, this is required and cannot be an empty string. */
  merchantDisplayName: string;
  /** The identifier of the Stripe Customer object. See https://stripe.com/docs/api/customers/object#customer_object-id */
  customerId?: string;
  /** A short-lived token that allows the SDK to access a Customer’s payment methods. */
  customerEphemeralKeySecret?: string;
  /** When set to true, separates out the payment method selection & confirmation steps.
   * If true, you must call `confirmPaymentSheetPayment` on your own. Defaults to false. */
  customFlow?: boolean;
  /** iOS only. Enable Apple Pay in the Payment Sheet by passing an ApplePayParams object.  */
  applePay?: ApplePayParams;
  /** Android only. Enable Google Pay in the Payment Sheet by passing a GooglePayParams object.  */
  googlePay?: GooglePayParams;
  /** The color styling to use for PaymentSheet UI. Defaults to 'automatic'. */
  style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
  /** A URL that redirects back to your app that PaymentSheet can use to auto-dismiss web views used for additional authentication, e.g. 3DS2 */
  returnURL?: string;
  /** Configuration for how billing details are collected during checkout. */
  billingDetailsCollectionConfiguration?: BillingDetailsCollectionConfiguration;
  /** PaymentSheet pre-populates the billing fields that are displayed in the Payment Sheet (only country and postal code, as of this version) with the values provided. */
  defaultBillingDetails?: BillingDetails;
  /**
   * The shipping information for the customer. If set, PaymentSheet will pre-populate the form fields with the values provided.
   * This is used to display a "Billing address is same as shipping" checkbox if `defaultBillingDetails` is not provided.
   * If `name` and `line1` are populated, it's also [attached to the PaymentIntent](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-shipping) during payment.
   */
  defaultShippingDetails?: AddressDetails;
  /** If true, allows payment methods that do not move money at the end of the checkout. Defaults to false.
   *
   * Some payment methods can’t guarantee you will receive funds from your customer at the end of the checkout
   * because they take time to settle (eg. most bank debits, like SEPA or ACH) or require customer action to
   * complete (e.g. OXXO, Konbini, Boleto). If this is set to true, make sure your integration listens to webhooks
   * for notifications on whether a payment has succeeded or not.
   */
  allowsDelayedPaymentMethods?: boolean;
  /** Customizes the appearance of PaymentSheet */
  appearance?: AppearanceParams;
  /** The label to use for the primary button. If not set, Payment Sheet will display suitable default labels for payment and setup intents. */
  primaryButtonLabel?: string;
};

export type IntentParams =
  | {
      paymentIntentClientSecret: string;
      setupIntentClientSecret?: undefined;
      intentConfiguration?: never;
    }
  | {
      setupIntentClientSecret: string;
      paymentIntentClientSecret?: undefined;
      intentConfiguration?: never;
    }
  | {
      setupIntentClientSecret?: never;
      paymentIntentClientSecret?: never;
      intentConfiguration: IntentConfiguration;
    };

export type ApplePayParams = {
  /** The two-letter ISO 3166 code of the country of your business, e.g. "US"  */
  merchantCountryCode: string;
  /**
   * An array of CartSummaryItem item objects that summarize the amount of the payment. If you're using a SetupIntent
   * for a recurring payment, you should set this to display the amount you intend to charge. */
  cartItems?: CartSummaryItem[];
  /** Sets the text displayed by the call to action button in the Apple Pay sheet. */
  buttonType?: ButtonType;
  /** A typical request is for a one-time payment. To support different types of payment requests, include a PaymentRequestType. Only supported on iOS 16 and up. */
  request?:
    | RecurringPaymentRequest
    | AutomaticReloadPaymentRequest
    | MultiMerchantRequest;
  /** Callback function for setting the order details (retrieved from your server) to give users the
   * ability to track and manage their purchases in Wallet. Stripe calls your implementation after the
   * payment is complete, but before iOS dismisses the Apple Pay sheet. You must call the `completion`
   * function, or else the Apple Pay sheet will hang. */
  setOrderTracking?: (
    completion: (
      orderIdentifier: string,
      orderTypeIdentifier: string,
      authenticationToken: string,
      webServiceUrl: string
    ) => void
  ) => void;
};

export type GooglePayParams = {
  /** The two-letter ISO 3166 code of the country of your business, e.g. "US"  */
  merchantCountryCode: string;
  /** The three-letter ISO 4217 alphabetic currency code, e.g. "USD" or "EUR". Required in order to support Google Pay when processing a Setup Intent. */
  currencyCode?: string;
  /** Whether or not to use the Google Pay test environment.  Set to `true` until you have applied for and been granted access to the Production environment. */
  testEnv?: boolean;
};

/**
 * Used to customize the appearance of your PaymentSheet
 */
export type AppearanceParams = RecursivePartial<{
  /** Describes the appearance of fonts in your PaymentSheet */
  font: FontConfig;
  /** Describes the colors in your PaymentSheet. Provide either a base config, or both `light` and `dark` configs, which will be useed based on whether the user is in Light or Dark mode.  */
  colors:
    | GlobalColorConfig
    | { light: GlobalColorConfig; dark: GlobalColorConfig };
  /** Describes the appearance of shapes in the PaymentSheet, such as buttons, inputs, and tabs. */
  shapes: {
    /** The border radius used for buttons, inputs, and tabs in your PaymentSheet.
     * @default 6.0
     */
    borderRadius: number;
    /** The border width used for inputs and tabs in your PaymentSheet.
     * @default 1.0
     */
    borderWidth: number;
    /** iOS only. The shadow used for buttons, inputs, and tabs in your PaymentSheet */
    shadow: ShadowConfig;
  };
  /** Describes the appearance of the primary "Pay" button at the bottom of your Payment Sheet */
  primaryButton: PrimaryButtonConfig;
}>;

export type FontConfig = {
  /**
   * The font used for regular text. PaymentSheet will attempt to use medium and bold versions of this font if they exist.
   *
   * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
   * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
   *
   * @default The OS's system font
   */
  family: string;
  /** The scale factor for all fonts in your PaymentSheet. This value is required to be greater than 0. Font sizes are multiplied by this value before being displayed. For example, setting this to 1.2 increases the size of all text by 20%.
   * @default 1.0
   */
  scale: number;
};

export type ShadowConfig = {
  /** The color of the shadow.
   * @default "#000000"
   * */
  color: string;
  /** The alpha or opacity of the shadow.
   * @default 0.05
   */
  opacity: number;
  /** The positioning of the shadow relative to the component. For example, a negative x and y will result in a shadow placed below and to the left of the component.
   * @default {x: 0, y: 2}
   */
  offset: { x: number; y: number };
  /** The blur radius of the shadow.
   * @default 4
   */
  blurRadius: number;
};

export type GlobalColorConfig = {
  /** A primary color used throughout your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System blue color on iOS, and "#007AFF" (light) / "#0074D4" (dark) on Android.
   */
  primary: string;
  /** The color used for the background of your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System background color on iOS, and "#ffffff" (light) / "#2e2e2e" (dark) on Android.
   */
  background: string;
  /** The color used for the background of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System background color (light) / System secondary background color (dark) on iOS, and "#ffffff" (light) / "#a9a9a9" (dark) on Android.
   */
  componentBackground: string;
  /** The color used for the external border of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System gray (3) color on iOS, and "#33787880" (light) / "#787880" (dark) on Android.
   */
  componentBorder: string;
  /** The color used for the internal border (meaning the border is shared with another component) of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System gray (3) color on iOS, and "#33787880" (light) / "#787880" (dark) on Android.
   */
  componentDivider: string;
  /** The color of the header text in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System label color on iOS, and "#000000" (light) / "#ffffff" (dark) on Android.
   */
  primaryText: string;
  /** The color of the label text of input fields, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System seconday label color on iOS, and "#000000" (light) / "#ffffff" (dark) on Android.
   */
  secondaryText: string;
  /** The color of the input text in your PaymentSheet components, such as the user's card number or zip code, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default "#000000"
   */
  componentText: string;
  /** The color of the placeholder text of input fields, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System label color on iOS, and "#99000000" (light) / "#99ffffff" (dark) on Android.
   */
  placeholderText: string;
  /** The color used for icons in your Payment Sheet, such as the close or back icons, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System seconday label color on iOS, and "#99000000" (light) / "#ffffff" (dark) on Android.
   */
  icon: string;
  /** The color used to indicate errors or destructive actions in your Payment Sheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System red color on iOS, and "#ff0000" (light) / "#ff0000" (dark) on Android.
   */
  error: string;
};

export type PrimaryButtonConfig = {
  /** The font family used specifically for the primary button.
   * @default The root `appearance.font.family`
   */
  font: Pick<FontConfig, 'family'>;
  /** The colors used specifically for the primary button. Provide either a base config, or both `light` and `dark` configs, which will be useed based on whether the user is in Light or Dark mode.  */
  colors:
    | PrimaryButtonColorConfig
    | { light: PrimaryButtonColorConfig; dark: PrimaryButtonColorConfig };
  /** Describes the border and shadow of the primary button. */
  shapes: {
    /** The border radius used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.borderRadius`
     */
    borderRadius: number;
    /** The border width used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.borderWidth`
     */
    borderWidth: number;
    /** iOS only. The shadow used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.shadow`
     */
    shadow: ShadowConfig;
  };
};

export type PrimaryButtonColorConfig = {
  /** The background color used for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The root `appearance.colors.primary`
   */
  background: string;
  /** The color of the text for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default White or black, depending on the color of the button.
   */
  text: string;
  /** The border color used for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System quaternary label on iOS, transparent on Android.
   */
  border: string;
};

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
export interface PaymentOption {
  label: string;
  image: string;
}

export type PresentOptions = {
  /** The number of milliseconds (after presenting) before the Payment Sheet closes automatically, at which point
   *`presentPaymentSheet` will resolve with an `error.code` of `PaymentSheetError.Timeout`. The default is no timeout.
   */
  timeout?: number;
};

export type BillingDetailsCollectionConfiguration = {
  /** How to collect the name field. Defaults to `CollectionMode.automatic`. */
  name?: CollectionMode;
  /** How to collect the phone field. Defaults to `CollectionMode.automatic`. */
  phone?: CollectionMode;
  /** How to collect the email field. Defaults to `CollectionMode.automatic`. */
  email?: CollectionMode;
  /** How to collect the billing address. Defaults to `CollectionMode.automatic`. */
  address?: AddressCollectionMode;
  /** Whether the values included in `Configuration.defaultBillingDetails` should be attached to the payment method, this includes fields that aren't displayed in the form. If `false` (the default), those values will only be used to prefill the corresponding fields in the form. */
  attachDefaultsToPaymentMethod?: Boolean;
};

export enum CollectionMode {
  /** The field may or may not be collected depending on the Payment Method's requirements. */
  AUTOMATIC = 'automatic',
  /** The field will never be collected. If this field is required by the Payment Method, you must provide it as part of `defaultBillingDetails`. */
  NEVER = 'never',
  /** The field will always be collected, even if it isn't required for the Payment Method. */
  ALWAYS = 'always',
}

export enum AddressCollectionMode {
  /** Only the fields required by the Payment Method will be collected, which may be none. */
  AUTOMATIC = 'automatic',
  /** Billing address will never be collected. If the Payment Method requires a billing address, you must provide it as part of `defaultBillingDetails`. */
  NEVER = 'never',
  /** Collect the full billing address, regardless of the Payment Method's requirements. */
  FULL = 'full',
}

export type IntentCreationError = StripeError<'Failed'>;

export type IntentCreationCallbackParams =
  | {
      clientSecret: string;
      error?: never;
    }
  | {
      clientSecret?: never;
      error: IntentCreationError;
    };

export type IntentConfiguration = {
  /*
    Called when the customer confirms payment. Your implementation should create a PaymentIntent or SetupIntent on your server and call the `intentCreationCallback` with its client secret or an error if one occurred.
    - Note: You must create the PaymentIntent or SetupIntent with the same values used as the `IntentConfiguration` e.g. the same amount, currency, etc.
    - Parameters:
      - paymentMethod: The PaymentMethod representing the customer's payment details.
      - shouldSavePaymentMethod: This is `true` if the customer selected the "Save this payment method for future use" checkbox. Set `setup_future_usage` on the PaymentIntent to `off_session` if this is `true`.
      - intentCreationCallback: Call this with the `client_secret` of the PaymentIntent or SetupIntent created by your server or the error that occurred. If you're using customFlow: false (default), the error's localizedMessage will be displayed to the customer in the sheet. If you're using customFlow: true, the `confirm` method fails with the error.
  */
  confirmHandler: (
    paymentMethod: Result,
    shouldSavePaymentMethod: boolean,
    intentCreationCallback: (result: IntentCreationCallbackParams) => void
  ) => void;
  /* Information about the payment (PaymentIntent) or setup (SetupIntent).*/
  mode: Mode;
  /* A list of payment method types to display to the customer. If undefined or empty, we dynamically determine the payment methods using your Stripe Dashboard settings. */
  paymentMethodTypes?: Array<string>;
};

export type Mode = PaymentMode | SetupMode;

/**
 * Controls when the funds will be captured. Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-capture_method
 */
export enum CaptureMethod {
  /** (Default) Stripe automatically captures funds when the customer authorizes the payment. */
  Automatic = 'Automatic',
  /** Place a hold on the funds when the customer authorizes the payment, but don’t capture the funds until later. (Not all payment methods support this.) */
  Manual = 'Manual',
  /** Asynchronously capture funds when the customer authorizes the payment.
  - Note: Recommended over `CaptureMethod.Automatic` due to improved latency, but may require additional integration changes.
  - Seealso: https://stripe.com/docs/payments/payment-intents/asynchronous-capture-automatic-async */
  AutomaticAsync = 'AutomaticAsync',
}

/* Use this if your integration creates a PaymentIntent */
export type PaymentMode = {
  /* Amount intended to be collected in the smallest currency unit (e.g. 100 cents to charge $1.00). Shown in Apple Pay, Google Pay, Buy now pay later UIs, the Pay button, and influences available payment methods.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-amount */
  amount: number;
  /*  Three-letter ISO currency code. Filters out payment methods based on supported currency.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-currency */
  currencyCode: string;
  /* Indicates that you intend to make future payments.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-setup_future_usage */
  setupFutureUsage?: FutureUsage;
  /* Controls when the funds will be captured.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-capture_method */
  captureMethod?: CaptureMethod;
};

/* Use this if your integration creates a SetupIntent */
export type SetupMode = {
  /*  Three-letter ISO currency code. Filters out payment methods based on supported currency.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-currency */
  currencyCode?: string;
  /*  Indicates that you intend to make future payments.
  Seealso: https://stripe.com/docs/api/payment_intents/create#create_payment_intent-setup_future_usage */
  setupFutureUsage: FutureUsage;
};
