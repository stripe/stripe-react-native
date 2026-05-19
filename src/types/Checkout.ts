/**
 * All types for the Checkout Session API.
 * @internal
 */
export namespace Checkout {
  /**
   * Configuration options for a `useCheckout` instance.
   * @internal
   */
  export interface Configuration {
    /**
     * Controls whether adaptive pricing is requested for this session.
     *
     * When allowed, Stripe may present prices in the customer's local
     * currency alongside the merchant's settlement currency.
     *
     * Default: `{ allowed: false }`.
     */
    adaptivePricing?: AdaptivePricing;
  }

  /**
   * Options for adaptive pricing behavior.
   * @internal
   */
  export interface AdaptivePricing {
    /**
     * Whether the integration allows adaptive pricing for this session.
     *
     * Set to `false` to prevent Stripe from activating adaptive pricing even
     * if the Checkout Session is configured for it on the server.
     *
     * Default: `false`.
     */
    allowed: boolean;
  }

  /**
   * The loading state of the checkout session.
   *
   * Returned as `state` from `useCheckout`. React re-renders automatically
   * whenever the session changes.
   *
   * - `loading` – a mutation or refresh is in flight; `session` is the most
   *   recently loaded value and may be stale.
   * - `loaded`  – session is current and ready.
   *
   * Before the initial session load completes, `state` is `null`.
   * @internal
   */
  export type State =
    | {
        /**
         * `loading` while a mutation or refresh is in flight.
         *
         * The associated `session` value is the most recently loaded copy and
         * may be stale.
         */
        status: 'loading';
        /** The most recently loaded session value. */
        session: Session;
      }
    | {
        /** `loaded` when the session is current and ready to use. */
        status: 'loaded';
        /** The latest checkout session value from Stripe. */
        session: Session;
      };

  /**
   * A Stripe Checkout Session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Session {
    /** Unique identifier for this checkout session. */
    id: string;
    /** The business name as configured in your Stripe account. */
    businessName?: string;
    /** Three-letter ISO 4217 currency code in lowercase (e.g. `"usd"`). */
    currency?: string;
    /** Currency options available when adaptive pricing is active. */
    currencyOptions: CurrencyOption[];
    /** The aggregate amounts calculated per discount for all line items. */
    discountAmounts: DiscountAmount[];
    /** The customer's email address, if available. */
    email?: string;
    /** The line items the customer is purchasing. */
    lineItems: LineItem[];
    /** Indicates whether this session was created in live mode. */
    livemode: boolean;
    /** The factor used to convert between minor and major currency units. */
    minorUnitsAmountDivisor?: number;
    /** The selected shipping option, if any. */
    shipping?: SelectedShipping;
    /** The shipping address set via `updateShippingAddress`, if any. */
    shippingAddress?: ContactAddress;
    /** The shipping rate options available for this session. */
    shippingOptions: ShippingOption[];
    /** The current session status, if available. */
    status?: Status;
    /** Tax computation status and aggregated tax amounts. */
    tax: Tax;
    /** Tax and discount details for the computed total amount. */
    total?: Total;
    /** The billing address set via `updateBillingAddress`, if any. */
    billingAddress?: ContactAddress;
  }

  /**
   * The mode of a checkout session.
   *
   * - `unknown` - A mode not recognized by this version of the SDK.
   * - `payment` - Accept one-time payments.
   * - `setup` - Save payment details to charge later.
   * - `subscription` - Set up fixed-price subscriptions.
   * @checkoutSessionsPreview
   * @internal
   */
  export type Mode = 'unknown' | 'payment' | 'setup' | 'subscription';

  /**
   * The status of a checkout session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Status {
    /** The lifecycle status of the session. */
    type: StatusType;
    /** The payment status. Only meaningful when type is `complete`. */
    paymentStatus?: PaymentStatus;
  }

  /**
   * The lifecycle status of a checkout session.
   *
   * - `unknown` - A status not recognized by this version of the SDK.
   * - `open` - The checkout session is still in progress.
   * - `complete` - The checkout session is complete.
   * - `expired` - The checkout session has expired.
   * @checkoutSessionsPreview
   * @internal
   */
  export type StatusType = 'unknown' | 'open' | 'complete' | 'expired';

  /**
   * The payment status of a checkout session.
   *
   * - `unknown` - A payment status not recognized by this version of the SDK.
   * - `paid` - The payment funds are available in your account.
   * - `unpaid` - The payment funds are not yet available in your account.
   * - `noPaymentRequired` - No payment is currently required for the session.
   * @checkoutSessionsPreview
   * @internal
   */
  export type PaymentStatus =
    | 'unknown'
    | 'paid'
    | 'unpaid'
    | 'noPaymentRequired';

  /**
   * A monetary amount with both a localized display string and a value in
   * the smallest currency unit (e.g. cents).
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Amount {
    /** Localized, formatted string including currency symbol (e.g. `"$10.00"`). */
    amount: string;
    /** Value in the smallest currency unit (e.g. cents for USD). */
    minorUnitsAmount: number;
  }

  /**
   * A monetary amount supporting sub-minor-unit precision.
   *
   * Use this for sub-cent pricing (e.g. usage-based billing) where rounding
   * to the nearest minor unit would lose precision.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface DecimalAmount {
    /** Localized, formatted string including currency symbol. */
    amount: string;
    /** Value in the smallest currency unit, with decimal precision. */
    minorUnitsAmount: number;
  }

  /**
   * Tax and discount details for the computed total amount of a checkout session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Total {
    /** Total of all line items, excluding tax, discounts, and shipping. */
    subtotal: Amount;
    /** Sum of all exclusive tax amounts. */
    taxExclusive: Amount;
    /** Sum of all inclusive tax amounts. */
    taxInclusive: Amount;
    /** Sum of all shipping amounts. */
    shippingRate: Amount;
    /** Sum of all discounts. A positive number reduces the amount to be paid. */
    discount: Amount;
    /** Grand total, including discounts and tax. */
    total: Amount;
    /** Amount of customer credit balance applied to the payment. */
    appliedBalance: Amount;
    /** When `true`, no payment is collected and the amount is added to the next invoice. */
    balanceAppliedToNextInvoice: boolean;
  }

  /**
   * Tax computation status and aggregated tax amounts for a checkout session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Tax {
    /** The current tax computation status. */
    status: TaxStatus;
    /** Per-tax-rate amounts, or undefined if tax has not been computed. */
    taxAmounts?: TaxAmount[];
  }

  /**
   * The tax computation status of a checkout session.
   *
   * - `unknown` - A status not recognized by this version of the SDK.
   * - `ready` - Tax is computed and the session is ready for confirmation.
   * - `requiresShippingAddress` - A shipping address is needed to calculate tax.
   * - `requiresBillingAddress` - A billing address is needed to calculate tax.
   * @checkoutSessionsPreview
   * @internal
   */
  export type TaxStatus =
    | 'unknown'
    | 'ready'
    | 'requiresShippingAddress'
    | 'requiresBillingAddress';

  /**
   * A tax amount calculated for a line item, shipping option, or aggregate session total.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface TaxAmount {
    /** The tax amount. */
    amount: Amount;
    /** Whether this tax is inclusive (already in subtotal) or exclusive (added on top). */
    inclusive: boolean;
    /** A user-facing description (e.g. `"Sales Tax"` or `"VAT 20%"`). */
    displayName: string;
  }

  /**
   * A line item in a checkout session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface LineItem {
    /** Unique identifier for this line item. */
    id: string;
    /** The display name shown for this line item. */
    name: string;
    /** An optional, merchant-supplied description. */
    description?: string;
    /** Image URLs configured on the underlying product. */
    images: string[];
    /** The quantity of items being purchased. */
    quantity: number;
    /** The cost of a single unit. */
    unitAmount?: Amount;
    /** The unit amount with sub-cent precision. */
    unitAmountDecimal?: DecimalAmount;
    /** Total before any discounts or exclusive taxes. */
    subtotal?: Amount;
    /** Total discount amount for this line item. */
    discount?: Amount;
    /** Total exclusive tax for this line item. */
    taxExclusive?: Amount;
    /** Total inclusive tax for this line item. */
    taxInclusive?: Amount;
    /** Final total for this line item, including discounts and tax. */
    total?: Amount;
    /** Per-discount breakdown for this line item. */
    discountAmounts: DiscountAmount[];
    /** Per-tax-rate breakdown for this line item. */
    taxAmounts: TaxAmount[];
    /** Configuration for adjustable quantity, if enabled. */
    adjustableQuantity?: AdjustableQuantity;
  }

  /**
   * Configuration for a customer-adjustable line item quantity.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface AdjustableQuantity {
    /** The minimum quantity the customer can purchase. */
    minimum: number;
    /** The maximum quantity the customer can purchase. */
    maximum: number;
  }

  /**
   * A shipping option available in a checkout session.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface ShippingOption {
    /** The shipping rate identifier. */
    id: string;
    /** The display name shown to the customer. */
    displayName?: string;
    /** The shipping cost. */
    amount: Amount;
    /** Three-letter ISO 4217 currency code in lowercase. */
    currency: string;
    /** The estimated delivery window, if available. */
    deliveryEstimate?: DeliveryEstimate;
  }

  /**
   * The estimated delivery range for a shipping option.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface DeliveryEstimate {
    /** The lower bound of the delivery estimate. */
    minimum?: DeliveryEstimateBound;
    /** The upper bound of the delivery estimate. */
    maximum?: DeliveryEstimateBound;
  }

  /**
   * A bound (minimum or maximum) of a delivery estimate.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface DeliveryEstimateBound {
    /** The unit of time. */
    unit: DeliveryEstimateUnit;
    /** The number of units. */
    value: number;
  }

  /**
   * The unit of time for a delivery estimate.
   * @checkoutSessionsPreview
   * @internal
   */
  export type DeliveryEstimateUnit =
    | 'unknown'
    | 'hour'
    | 'day'
    | 'businessDay'
    | 'week'
    | 'month';

  /**
   * The shipping option selected for a checkout session, plus any computed
   * shipping tax.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface SelectedShipping {
    /** The selected shipping option. */
    shippingOption: ShippingOption;
    /** Tax amounts calculated for the shipping cost. */
    taxAmounts: TaxAmount[];
  }

  /**
   * A discount applied to a checkout session or line item.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface DiscountAmount {
    /** The discount amount. A positive number reduces the amount to be paid. */
    amount: Amount;
    /** A user-facing description of the discount. */
    displayName: string;
    /** The promotion code used to apply this discount, if any. */
    promotionCode?: string;
  }

  /**
   * A currency option available on a checkout session when adaptive pricing
   * is active.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface CurrencyOption {
    /** The total amount in this currency. */
    amount: Amount;
    /** Three-letter ISO 4217 currency code in lowercase. */
    currency: string;
    /** Conversion details, present only for the customer's local currency. */
    currencyConversion?: CurrencyConversion;
  }

  /**
   * Currency conversion details for an adaptive-pricing currency option.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface CurrencyConversion {
    /** The exchange rate used to convert source to customer currency. */
    fxRate: string;
    /** The merchant's original currency (three-letter ISO 4217 code). */
    sourceCurrency: string;
  }

  /**
   * A contact address containing a name, phone, and postal address.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface ContactAddress {
    /** The customer's or recipient's name, if provided. */
    name?: string;
    /** The customer's or recipient's phone number, if provided. */
    phone?: string;
    /** The postal address. */
    address: Address;
  }

  /**
   * A postal address used for billing, shipping, or tax updates.
   * @checkoutSessionsPreview
   * @internal
   */
  export interface Address {
    /** The country for this address, such as `"US"`. */
    country: string;
    /** The first address line. */
    line1?: string;
    /** The second address line. */
    line2?: string;
    /** The city, district, suburb, town, or village. */
    city?: string;
    /** The state, county, province, or region. */
    state?: string;
    /** The postal or ZIP code. */
    postalCode?: string;
  }

  /**
   * A Checkout-specific error returned from `useCheckout` or a Checkout
   * mutation method.
   * @internal
   */
  export interface Error {
    /** A machine-readable error code describing the failure. */
    code: ErrorCode;
    /** A human-readable message describing the failure. */
    message: string;
  }

  /**
   * The set of Checkout-specific error codes.
   *
   * - `Failed` - The operation could not be completed.
   * - `InvalidClientSecret` - The provided Checkout Session client secret is
   *   invalid.
   * - `SessionNotOpen` - The Checkout Session is no longer open for updates.
   * - `SheetCurrentlyPresented` - The operation is unavailable while
   *   PaymentSheet is being presented.
   * - `Canceled` - The operation was canceled before completion.
   * @internal
   */
  export type ErrorCode =
    | 'Failed'
    | 'InvalidClientSecret'
    | 'SessionNotOpen'
    | 'SheetCurrentlyPresented'
    | 'Canceled';
}

/**
 * A handle to a live Checkout Session.
 *
 * Returned by `useCheckout`. Call mutation methods to update the session;
 * the hook's `state` updates automatically after each mutation.
 * @internal
 */
export interface Checkout {
  /** @internal Opaque key for the native Checkout instance. Used by `initPaymentSheet`. */
  readonly sessionKey: string;

  /**
   * Sets the shipping address for this checkout.
   *
   * The address is stored locally and merged into PaymentSheet configuration
   * when presenting payment UI. If automatic tax is enabled and the tax
   * address source is "shipping", the address is also sent to the server to
   * compute updated tax amounts.
   *
   * @param address - The shipping address to set.
   * @param name - The recipient's name.
   * @param phone - The recipient's phone number.
   */
  updateShippingAddress(
    address: Checkout.Address,
    name?: string,
    phone?: string
  ): Promise<void>;

  /**
   * Sets the billing address for this checkout.
   *
   * The address is stored locally and merged into PaymentSheet configuration
   * when presenting payment UI. If automatic tax is enabled and the tax
   * address source is "billing", the address is also sent to the server to
   * compute updated tax amounts.
   *
   * @param address - The billing address to set.
   * @param name - The customer's name.
   * @param phone - The customer's phone number.
   */
  updateBillingAddress(
    address: Checkout.Address,
    name?: string,
    phone?: string
  ): Promise<void>;

  /**
   * Applies a promotion code to the session.
   * - Parameter code: The promotion code to apply (e.g. `"SUMMER2026"`).
   * - Throws: `CheckoutError` if applying the promotion code fails.
   * @internal
   */
  applyPromotionCode(code: string): Promise<void>;

  /**
   * Removes the currently applied promotion code.
   * - Throws: `CheckoutError` if removing the promotion code fails.
   * @internal
   */
  removePromotionCode(): Promise<void>;

  /**
   * Updates the quantity of a line item.
   * @param lineItemId - The ID of the line item to update.
   * @param quantity - The new quantity to set.
   * - Throws: `CheckoutError` if updating the line item quantity fails.
   * @internal
   */
  updateLineItemQuantity(lineItemId: string, quantity: number): Promise<void>;

  /**
   * Selects a shipping option for the session.
   * @param id - The ID of the shipping rate to select.
   * - Throws: `CheckoutError` if selecting the shipping option fails.
   * @internal
   */
  selectShippingOption(id: string): Promise<void>;

  /**
   * Sets the customer's tax ID on the session.
   * @param type - The tax ID type (e.g. `"eu_vat"`).
   * @param value - The tax ID value (e.g. `"DE123456789"`).
   * - Throws: `CheckoutError` if updating the tax ID fails.
   * @internal
   */
  updateTaxId(type: string, value: string): Promise<void>;

  /**
   * Runs an async operation that updates the Checkout Session on your server,
   * then automatically refreshes the local session state.
   *
   * Call your server inside `serverUpdate` to modify the Checkout Session.
   * A 20-second timeout is enforced by the native SDK.
   *
   * @param serverUpdate - An async function that calls your server to update the session.
   * - Throws: `CheckoutError` if the operation times out or fails.
   * @checkoutSessionsPreview
   * @internal
   */
  runServerUpdate(serverUpdate: () => Promise<void>): Promise<void>;
}
