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
   * The status of a checkout session.
   *
   * - `unknown` - A status not recognized by this version of the SDK.
   * - `open` - The checkout session is still in progress.
   * - `complete` - The checkout session is complete.
   * - `expired` - The checkout session has expired.
   * @internal
   */
  export type Status = 'unknown' | 'open' | 'complete' | 'expired';

  /**
   * The payment status of a checkout session.
   *
   * - `unknown` - A payment status not recognized by this version of the SDK.
   * - `paid` - The payment funds are available in your account.
   * - `unpaid` - The payment funds are not yet available in your account.
   * - `noPaymentRequired` - No payment is currently required for the session.
   * @internal
   */
  export type PaymentStatus =
    | 'unknown'
    | 'paid'
    | 'unpaid'
    | 'noPaymentRequired';

  /**
   * A read-only snapshot of a Stripe Checkout Session.
   * @internal
   */
  export interface Session {
    /** Unique identifier for this checkout session. */
    id: string;
    /** The current session state, if available. */
    status?: Status;
    /** The payment status for this checkout session. */
    paymentStatus: PaymentStatus;
    /** Three-letter ISO 4217 currency code in lowercase (e.g. `"usd"`). */
    currency?: string;
    /** Indicates whether this session was created in live mode. */
    livemode: boolean;
    /** A summary of monetary totals for this session, if available. */
    totals?: Totals;
    /** The line items purchased by the customer. */
    lineItems: LineItem[];
    /** The shipping rate options available for this session. */
    shippingOptions: ShippingOption[];
    /** The discounts applied to this session. */
    discounts: Discount[];
    /** The Stripe customer ID attached to this session, if any. */
    customerId?: string;
    /** The customer's email address, if available. */
    customerEmail?: string;
    /** The billing address set via `updateBillingAddress`, if any. */
    billingAddress?: AddressUpdate;
    /** The shipping address set via `updateShippingAddress`, if any. */
    shippingAddress?: AddressUpdate;
  }

  /**
   * Monetary totals for a checkout session.
   *
   * All amounts are in the smallest currency unit (e.g. cents for USD).
   * @internal
   */
  export interface Totals {
    /** The subtotal amount before discounts, shipping, and tax. */
    subtotal: number;
    /** The final total after discounts, shipping, and tax. */
    total: number;
    /** The amount currently due from the customer. */
    due: number;
    /** The total discount amount applied to the session. */
    discount: number;
    /** The total shipping amount. */
    shipping: number;
    /** The total tax amount applied to the session. */
    tax: number;
  }

  /**
   * A line item in a checkout session.
   * @internal
   */
  export interface LineItem {
    /** Unique identifier for this line item. */
    id: string;
    /** The display name shown for this line item. */
    name: string;
    /** The quantity for this line item. */
    quantity: number;
    /** The per-unit price in the smallest currency unit. */
    unitAmount: number;
    /** Three-letter ISO 4217 currency code in lowercase. */
    currency: string;
  }

  /**
   * A shipping option available in a checkout session.
   * @internal
   */
  export interface ShippingOption {
    /** The shipping rate identifier. */
    id: string;
    /** The display name shown to the customer. */
    displayName: string;
    /** The shipping amount in the smallest currency unit. */
    amount: number;
    /** Three-letter ISO 4217 currency code in lowercase. */
    currency: string;
    /** The estimated delivery window shown to the customer, if available. */
    deliveryEstimate?: string;
  }

  /**
   * A discount applied to a checkout session.
   * @internal
   */
  export interface Discount {
    /** The coupon associated with this discount. */
    coupon: Coupon;
    /** The promotion code used to apply this discount, if any. */
    promotionCode?: string;
    /** The discount amount in the smallest currency unit. */
    amount: number;
  }

  /**
   * A coupon associated with a checkout discount.
   * @internal
   */
  export interface Coupon {
    /** The coupon identifier. */
    id: string;
    /** The display name of the coupon, if one exists. */
    name?: string;
    /** The percentage off, if this is a percentage-based coupon. */
    percentOff?: number;
    /** The fixed amount off, in the smallest currency unit, if applicable. */
    amountOff?: number;
  }

  /**
   * A locally stored address override for checkout.
   *
   * Address updates are merged into PaymentSheet configuration and may also be
   * sent to Stripe when tax calculation depends on the billing or shipping
   * address.
   * @internal
   */
  export interface AddressUpdate {
    /** The customer's or recipient's name, if provided. */
    name?: string;
    /** The customer's or recipient's phone number, if provided. */
    phone?: string;
    /** The postal address to use for the update. */
    address: Address;
  }

  /**
   * A postal address used for billing, shipping, or tax updates.
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
   * Refreshes the session by fetching the latest copy from Stripe.
   *
   * Call this after making server-side changes to the Checkout Session
   * so the local state stays in sync.
   * - Throws: `CheckoutError` if refreshing the session fails.
   * @internal
   */
  refresh(): Promise<void>;
}
