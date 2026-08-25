import type { ViewProps } from 'react-native';
import type { CardBrand } from './Common';
import type { StripeError } from './Errors';
import type {
  AppearanceParams,
  PaymentMethodLayout,
  TermsDisplay,
} from './PaymentSheet';
import type { EmbeddedRowSelectionBehavior } from './EmbeddedPaymentElement';

/**
 * Controls a Checkout Session, including its state, Payment Element,
 * mutations, and confirmation flow.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export interface CheckoutController {
  /**
   * The controller lifecycle status. Disable mutation and confirmation UI
   * unless this is `ready`.
   */
  readonly status: 'ready' | 'updating' | 'confirming' | 'destroyed';
  /** The latest snapshot of the customer's Checkout Session. */
  readonly session: Checkout.Session;
  /** The Payment Element owned by this controller. */
  readonly paymentElement: CheckoutPaymentElement;
  /** Updates the customer's email address. Pass `null` to clear it. */
  updateEmail(email: string | null): Promise<void>;
  /** Sets or clears the customer's shipping address. */
  updateShippingAddress(
    params: Checkout.UpdateShippingAddressParams
  ): Promise<void>;
  /** Applies a promotion code after trimming leading and trailing whitespace. */
  applyPromotionCode(promotionCode: string): Promise<void>;
  /** Removes the currently applied promotion code, if any. */
  removePromotionCode(): Promise<void>;
  /** Runs a server update, then refreshes the local Checkout Session. */
  runServerUpdate(serverUpdate: () => Promise<void>): Promise<void>;
  /** Clears the customer's currently selected payment option. */
  clearPaymentOption(): Promise<void>;
  /** Confirms the Checkout Session for the selected payment option. */
  confirm(): Promise<Checkout.Result>;
  /** Releases the controller's native resources and clears its loaded state. */
  destroy(): Promise<void>;
}

/**
 * The Checkout-owned Payment Element. It collects a customer's payment method
 * inline or in a sheet.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export interface CheckoutPaymentElement {
  /** Presents Payment Element in a sheet and resolves when it is dismissed. */
  present(): Promise<void>;
}

/**
 * Props for the inline Checkout Payment Element view.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export interface CheckoutPaymentElementViewProps extends ViewProps {
  /** The Payment Element owned by Checkout. */
  element: CheckoutPaymentElement;
}

/**
 * Types used by the Checkout private-preview APIs.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export namespace Checkout {
  /**
   * The appearance to use for Checkout UI.
   * @CheckoutSessionPrivatePreview
   */
  export type UserInterfaceStyle = 'alwaysLight' | 'alwaysDark' | 'automatic';

  /**
   * Configuration used to create Checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface CreateOptions {
    /** The Checkout Session client secret. */
    clientSecret: string;
    /** A URL that redirects back to your app after payment authentication. */
    returnURL: string;
    /** Customer information already known by your app. */
    defaults?: Defaults;
    /** Customer-facing business name. */
    merchantDisplayName?: string;
    /** Overrides the light or dark appearance. */
    style?: UserInterfaceStyle;
    /** Configuration for the Checkout-owned Payment Element. */
    paymentElement?: PaymentElementConfiguration;
  }

  /**
   * Options for loading and managing Checkout with `useCheckout`.
   * @CheckoutSessionPrivatePreview
   */
  export interface UseOptions {
    /** Defaults to `true`. When `false`, the status remains `idle`. */
    enabled?: boolean;
    /**
     * Fetches a fresh Checkout Session client secret and its configuration.
     * Called when enabled on mount and again by `reload()`.
     */
    getConfiguration: () => Promise<CreateOptions>;
  }

  /**
   * Reactive Checkout state and controller methods returned by `useCheckout`.
   * @CheckoutSessionPrivatePreview
   */
  export interface UseResult {
    /** The current hook or controller lifecycle status. */
    readonly status:
      | 'idle'
      | 'loading'
      | 'ready'
      | 'updating'
      | 'confirming'
      | 'error';
    /** The latest session snapshot, or `null` before Checkout is ready. */
    readonly session: Session | null;
    /** The Checkout-owned Payment Element, or `null` before Checkout is ready. */
    readonly paymentElement: CheckoutPaymentElement | null;
    /** The initialization error when `status` is `error`; otherwise `null`. */
    readonly error: StripeError<ErrorCode> | null;
    /** Fetches fresh configuration and replaces the current native controller. */
    reload(): Promise<void>;
    /** Updates the customer's email address. Pass `null` to clear it. */
    updateEmail(email: string | null): Promise<void>;
    /** Sets or clears the customer's shipping address. */
    updateShippingAddress(params: UpdateShippingAddressParams): Promise<void>;
    /** Applies a promotion code entered by the customer. */
    applyPromotionCode(promotionCode: string): Promise<void>;
    /** Removes the currently applied promotion code, if any. */
    removePromotionCode(): Promise<void>;
    /** Runs a server update and refreshes the local Checkout Session. */
    runServerUpdate(serverUpdate: () => Promise<void>): Promise<void>;
    /** Clears the customer's currently selected payment option. */
    clearPaymentOption(): Promise<void>;
    /** Confirms the Checkout Session for the selected payment option. */
    confirm(): Promise<Result>;
  }

  /**
   * Parameters for updating or clearing the customer's shipping address.
   * @CheckoutSessionPrivatePreview
   */
  export interface UpdateShippingAddressParams {
    /** The recipient's name. */
    name?: string | null;
    /** The shipping address. Pass `null` to clear it. */
    address: Address | null;
  }

  /**
   * The result of confirming a Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export type Result =
    | {
        /** The customer completed the payment flow. */
        status: 'completed';
        /** The payment status after Checkout completed. */
        paymentStatus: PaymentStatus;
      }
    | {
        /** The customer canceled the payment flow. */
        status: 'canceled';
      }
    | {
        /** The payment flow failed. */
        status: 'failed';
        /** The error that caused the payment flow to fail. */
        error: StripeError<ErrorCode>;
      };

  /**
   * Error codes returned by Checkout APIs.
   * @CheckoutSessionPrivatePreview
   */
  export type ErrorCode =
    | 'Failed'
    | 'InvalidClientSecret'
    | 'SessionNotOpen'
    | 'SheetCurrentlyPresented'
    | 'Timeout'
    | 'Canceled';

  /**
   * Known customer details used to prefill Checkout and its elements.
   * @CheckoutSessionPrivatePreview
   */
  export interface Defaults {
    /** The customer's known billing contact details. */
    billingDetails?: ContactDetails;
    /** The customer's known shipping contact details. */
    shippingDetails?: ContactDetails;
    /** The customer's known phone number. */
    phone?: string;
    /** The customer's known email address. */
    email?: string;
  }

  /**
   * A customer's name and postal address.
   * @CheckoutSessionPrivatePreview
   */
  export interface ContactDetails {
    /** The customer's name. */
    name?: string;
    /** The customer's postal address. */
    address?: Address;
  }

  /**
   * Configuration for Apple Pay in Checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface ApplePayConfiguration {
    /** ISO 3166-1 alpha-2 country code where the transaction is processed. */
    merchantCountryCode: string;
    /** The type of Apple Pay button to display. */
    buttonType?: ApplePayButtonType;
  }

  /**
   * Apple Pay button type options.
   * @CheckoutSessionPrivatePreview
   */
  export type ApplePayButtonType =
    | 'plain'
    | 'buy'
    | 'setUp'
    | 'inStore'
    | 'donate'
    | 'checkout'
    | 'book'
    | 'subscribe'
    | 'reload'
    | 'addMoney'
    | 'topUp'
    | 'order'
    | 'rent'
    | 'support'
    | 'contribute'
    | 'tip'
    | 'continue';

  /**
   * Configuration for Google Pay in Checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface GooglePayConfiguration {
    /** Whether to use the Google Pay test environment. Defaults to `false`. */
    testEnv?: boolean;
    /** An optional label to display with the amount. */
    label?: string;
    /** The Google Pay button type. Defaults to `pay`. */
    buttonType?: GooglePayButtonType;
    /** Additional card networks to enable, for example `INTERAC`. */
    additionalEnabledNetworks?: string[];
  }

  /**
   * Google Pay button type options.
   * @CheckoutSessionPrivatePreview
   */
  export type GooglePayButtonType =
    | 'buy'
    | 'book'
    | 'checkout'
    | 'donate'
    | 'order'
    | 'pay'
    | 'subscribe'
    | 'plain';

  /**
   * Configuration for Link in Checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface LinkConfiguration {
    /** Controls when Link is displayed. Defaults to `automatic`. */
    display?: 'automatic' | 'never';
  }

  /**
   * Controls the default state of save-payment-method controls.
   * @CheckoutSessionPrivatePreview
   */
  export type SavePaymentMethodOptInBehavior =
    | 'automatic'
    | 'requiresOptIn'
    | 'requiresOptOut';

  /**
   * Appearance configuration for Checkout Payment Element.
   * @CheckoutSessionPrivatePreview
   */
  export type PaymentElementAppearance = AppearanceParams;

  /**
   * Controls how the inline Payment Element handles row selection.
   * @CheckoutSessionPrivatePreview
   */
  export type RowSelectionBehavior = EmbeddedRowSelectionBehavior;

  /**
   * Controls how billing details are collected during checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface BillingDetailsCollectionConfiguration {
    /** How to collect the name field. Defaults to `automatic`. */
    name?: 'automatic' | 'always';
    /** How to collect the phone field. Defaults to `automatic`. */
    phone?: 'automatic' | 'always';
    /** How to collect the billing address. Defaults to `automatic`. */
    address?: 'automatic' | 'full';
    /** Whether default billing details are attached to the payment method. */
    attachDefaultsToPaymentMethod?: boolean;
  }

  /**
   * Configuration for the Checkout-owned Payment Element.
   * @CheckoutSessionPrivatePreview
   */
  export interface PaymentElementConfiguration {
    /** Controls how Payment Element asks customers to save payment methods. */
    savePaymentMethodOptInBehavior?: SavePaymentMethodOptInBehavior;
    /** Customizes the appearance of Payment Element. */
    appearance?: PaymentElementAppearance;
    /** Preferred networks for co-branded cards. */
    preferredNetworks?: CardBrand[];
    /** Controls how billing details are collected during checkout. */
    billingDetailsCollectionConfiguration?: BillingDetailsCollectionConfiguration;
    /** A custom message shown when a saved payment method is removed. iOS only. */
    removeSavedPaymentMethodMessage?: string;
    /** Overrides the default order of payment method types. */
    paymentMethodOrder?: string[];
    /** Whether the new-card form opens the card scanner automatically. */
    opensCardScannerAutomatically?: boolean;
    /** Whether Stripe address autocomplete endpoints are used. */
    useAutocompleteEndpoints?: boolean;
    /** Controls legal agreement text for each payment method type. */
    termsDisplay?: Record<string, TermsDisplay>;
    /** The layout used when Payment Element is presented as a sheet. */
    paymentMethodLayout?: PaymentMethodLayout;
    /** Whether the embedded view displays mandate text. Defaults to `false`. */
    displaysMandateText?: boolean;
    /** Controls selection in the embedded view. */
    rowSelectionBehavior?: RowSelectionBehavior;
    /** Apple Pay configuration. iOS only. */
    applePay?: ApplePayConfiguration;
    /** Google Pay configuration. Android only. */
    googlePay?: GooglePayConfiguration;
    /** Link display configuration. */
    link?: LinkConfiguration;
  }

  /**
   * A view of the Checkout Session that represents the customer's checkout.
   * @CheckoutSessionPrivatePreview
   */
  export interface Session {
    /** The Checkout Session ID. */
    id: string;
    /** The business name configured in Stripe Business Public Details. */
    businessName?: string;
    /** Whether the Checkout Session is in live mode. */
    livemode: boolean;
    /** Three-letter ISO 4217 currency code in lowercase. */
    currency: string;
    /** Factor used to convert minor currency units to major units. */
    minorUnitsAmountDivisor?: number;
    /** Currency presentation details for the customer. */
    presentmentDetails?: PresentmentDetails;
    /** The customer's email address. */
    email?: string;
    /** The customer's currently selected payment option. */
    paymentOption?: PaymentOptionDisplayData;
    /** The customer's shipping contact details and postal address. */
    shippingAddress?: ShippingAddress;
    /** The items the customer is purchasing. */
    orderSummaryItems: OrderSummaryItem[];
    /** Aggregate discount amounts for all order items. */
    discountAmounts: DiscountAmount[];
    /** Tax computation status. */
    tax?: Tax;
    /** Aggregate amounts for each tax rate after Checkout computes tax. */
    taxAmounts?: TaxAmount[];
    /** Tax and discount breakdown for the computed session total. */
    totals: Totals;
    /** Lifecycle status of the Checkout Session. */
    status: SessionStatus;
    /** The error encountered the last time confirmation ran. */
    lastPaymentError?: StripeError<ErrorCode>;
  }

  /**
   * Currency presentation details for the Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export interface PresentmentDetails {
    /** Currency presented to the customer during payment. */
    presentmentCurrency: string;
  }

  /**
   * Display data for the customer's currently selected payment option.
   * @CheckoutSessionPrivatePreview
   */
  export interface PaymentOptionDisplayData {
    /** A Base64-encoded image representing the payment method. */
    image: string;
    /** Customer-facing label, for example `•••• 4242`. */
    label: string;
    /** Billing details collected for the selected payment method. */
    billingDetails?: BillingDetails;
    /** The payment method, external payment method, or wallet type. */
    paymentMethodType: string;
    /** HTML mandate text to render when the element does not render it. */
    mandateHTML?: string;
  }

  /**
   * Billing details associated with a selected payment method.
   * @CheckoutSessionPrivatePreview
   */
  export interface BillingDetails {
    /** The customer's name. */
    name?: string;
    /** The customer's email address. */
    email?: string;
    /** The customer's phone number. */
    phone?: string;
    /** The customer's billing address. */
    address?: Address;
  }

  /**
   * The customer's shipping contact details and postal address.
   * @CheckoutSessionPrivatePreview
   */
  export interface ShippingAddress {
    /** The recipient's name. */
    name?: string;
    /** The shipping address. */
    address: Address;
  }

  /**
   * A postal address.
   * @CheckoutSessionPrivatePreview
   */
  export interface Address {
    /** Two-letter ISO 3166-1 alpha-2 country code. */
    country: string;
    /** Address line 1. */
    line1?: string;
    /** Address line 2. */
    line2?: string;
    /** City, district, suburb, town, or village. */
    city?: string;
    /** State, county, province, or region. */
    state?: string;
    /** ZIP or postal code. */
    postalCode?: string;
  }

  /**
   * An item or group of items in the Checkout order summary.
   * @CheckoutSessionPrivatePreview
   */
  export type OrderSummaryItem = OneTimePriceOrderSummaryItem;

  /**
   * A group of one-time-price items in the Checkout order summary.
   * @CheckoutSessionPrivatePreview
   */
  export interface OneTimePriceOrderSummaryItem {
    /** Identifies this as a one-time-price group. */
    type: 'one_time_price';
    /** A stable key for this order summary item. */
    key: string;
    /** An optional description. */
    description?: string;
    /** The individual items in this group. */
    items: OneTimePriceItem[];
    /** Aggregate amounts for this group. */
    amountDetails: AmountDetails;
  }

  /**
   * A one-time-price item the customer is purchasing.
   * @CheckoutSessionPrivatePreview
   */
  export interface OneTimePriceItem {
    /** A stable key for this item. */
    key: string;
    /** The customer-facing item name. */
    displayName: string;
    /** URLs for images representing this item. */
    images: string[];
    /** The price for one unit. */
    unitAmount: Amount;
    /** The unit price with sub-minor-unit precision, when available. */
    unitAmountDecimal?: Amount;
    /** A customer-facing label for one unit, such as `seat`. */
    unitLabel?: string;
    /** The quantity being purchased. */
    quantity: number;
    /** Limits for customer-adjustable quantity, when enabled. */
    adjustableQuantity?: AdjustableQuantity;
  }

  /**
   * Aggregate amounts for an order summary item.
   * @CheckoutSessionPrivatePreview
   */
  export interface AmountDetails {
    /** The total after discounts and tax. */
    total: Amount;
    /** The subtotal before discounts and tax. */
    subtotal: Amount;
    /** Tax amounts grouped by tax rate after Checkout computes tax. */
    taxAmounts?: TaxAmount[];
    /** The total discount amount. */
    discount: Amount;
    /** The total inclusive tax amount. */
    taxInclusive: Amount;
    /** The total exclusive tax amount. */
    taxExclusive: Amount;
  }

  /**
   * A monetary amount in display and minor-unit forms.
   * @CheckoutSessionPrivatePreview
   */
  export interface Amount {
    /** Localized display value, for example `$10.00`. */
    amount: string;
    /** Value in the currency's smallest unit. */
    minorUnitsAmount: number;
  }

  /**
   * A tax amount calculated for the order summary.
   * @CheckoutSessionPrivatePreview
   */
  export interface TaxAmount extends Amount {
    /** Whether this tax is included in the subtotal. */
    inclusive: boolean;
    /** Customer-facing tax name. */
    displayName: string;
    /** The tax percentage, when available. */
    percentage?: number;
  }

  /**
   * Minimum and maximum values for a customer-adjustable quantity.
   * @CheckoutSessionPrivatePreview
   */
  export interface AdjustableQuantity {
    /** The minimum allowed quantity. */
    minimum: number;
    /** The maximum allowed quantity. */
    maximum: number;
  }

  /**
   * An aggregate discount amount for the Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export interface DiscountAmount extends Amount {
    /** Customer-facing discount name. */
    displayName: string;
    /** The applied promotion code, when the discount came from one. */
    promotionCode?: string;
    /** The percentage discounted, when applicable. */
    percentOff?: number;
  }

  /**
   * Tax computation status for the Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export interface Tax {
    /** Whether tax is ready or needs a customer address. */
    status: 'ready' | 'requiresShippingAddress' | 'requiresBillingAddress';
  }

  /**
   * Tax and discount breakdown for the computed Checkout Session total.
   * @CheckoutSessionPrivatePreview
   */
  export interface Totals {
    /** The subtotal before discounts and tax. */
    subtotal: Amount;
    /** The total exclusive tax amount. */
    taxExclusive: Amount;
    /** The total inclusive tax amount. */
    taxInclusive: Amount;
    /** The total discount amount. */
    discount: Amount;
    /** The final order total. */
    total: Amount;
  }

  /**
   * The lifecycle status of a Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export type SessionStatus =
    | {
        /** The Checkout Session is still in progress. */
        type: 'open';
      }
    | {
        /** The Checkout Session has expired. */
        type: 'expired';
      }
    | {
        /** The customer completed the Checkout Session. */
        type: 'complete';
        /** The payment status after completion. */
        paymentStatus: PaymentStatus;
      };

  /**
   * The payment status of a completed Checkout Session.
   * @CheckoutSessionPrivatePreview
   */
  export type PaymentStatus = 'paid' | 'unpaid' | 'noPaymentRequired';
}
