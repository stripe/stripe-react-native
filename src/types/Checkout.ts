/**
 * @checkoutSessionsPreview
 * All types for the Checkout Session API.
 */
export namespace Checkout {
  export interface Configuration {
    /**
     * Controls whether adaptive pricing is requested for this session.
     * Default: `{ allowed: true }`.
     */
    adaptivePricing?: AdaptivePricing;
  }

  export interface AdaptivePricing {
    /**
     * Set to `false` to prevent Stripe from activating adaptive pricing
     * even if the Checkout Session is configured for it on the server.
     * Default: `true`.
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
   * @checkoutSessionsPreview
   */
  export type State =
    | { status: 'loading'; session: Session }
    | { status: 'loaded'; session: Session };

  export type Status = 'unknown' | 'open' | 'complete' | 'expired';

  export type PaymentStatus =
    | 'unknown'
    | 'paid'
    | 'unpaid'
    | 'noPaymentRequired';

  export interface Session {
    id: string;
    status?: Status;
    paymentStatus: PaymentStatus;
    /** Three-letter ISO 4217 currency code in lowercase (e.g. `"usd"`). */
    currency?: string;
    livemode: boolean;
    /** All amounts in smallest currency unit (e.g. cents for USD). */
    totals?: Totals;
    lineItems: LineItem[];
    shippingOptions: ShippingOption[];
    discounts: Discount[];
    customerId?: string;
    customerEmail?: string;
    billingAddress?: AddressUpdate;
    shippingAddress?: AddressUpdate;
  }

  /** All amounts are in the smallest currency unit (e.g. cents for USD). */
  export interface Totals {
    subtotal: number;
    total: number;
    due: number;
    discount: number;
    shipping: number;
    tax: number;
  }

  export interface LineItem {
    id: string;
    name: string;
    quantity: number;
    unitAmount: number;
    currency: string;
  }

  export interface ShippingOption {
    id: string;
    displayName: string;
    amount: number;
    currency: string;
    deliveryEstimate?: string;
  }

  export interface Discount {
    coupon: Coupon;
    promotionCode?: string;
    amount: number;
  }

  export interface Coupon {
    id: string;
    name?: string;
    percentOff?: number;
    amountOff?: number;
  }

  export interface AddressUpdate {
    name?: string;
    phone?: string;
    address: Address;
  }

  export interface Address {
    country: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }

  export interface Error {
    code: ErrorCode;
    message: string;
  }

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
 * @checkoutSessionsPreview
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
   * @checkoutSessionsPreview
   */
  applyPromotionCode(code: string): Promise<void>;

  /**
   * Removes the currently applied promotion code.
   * - Throws: `CheckoutError` if removing the promotion code fails.
   * @checkoutSessionsPreview
   */
  removePromotionCode(): Promise<void>;

  /**
   * Updates the quantity of a line item.
   * @param lineItemId - The ID of the line item to update.
   * @param quantity - The new quantity to set.
   * - Throws: `CheckoutError` if updating the line item quantity fails.
   * @checkoutSessionsPreview
   */
  updateLineItemQuantity(lineItemId: string, quantity: number): Promise<void>;

  /**
   * Selects a shipping option for the session.
   * @param id - The ID of the shipping rate to select.
   * - Throws: `CheckoutError` if selecting the shipping option fails.
   * @checkoutSessionsPreview
   */
  selectShippingOption(id: string): Promise<void>;

  /**
   * Sets the customer's tax ID on the session.
   * @param type - The tax ID type (e.g. `"eu_vat"`).
   * @param value - The tax ID value (e.g. `"DE123456789"`).
   * - Throws: `CheckoutError` if updating the tax ID fails.
   * @checkoutSessionsPreview
   */
  updateTaxId(type: string, value: string): Promise<void>;

  /**
   * Refreshes the session by fetching the latest copy from Stripe.
   *
   * Call this after making server-side changes to the Checkout Session
   * so the local state stays in sync.
   * - Throws: `CheckoutError` if refreshing the session fails.
   * @checkoutSessionsPreview
   */
  refresh(): Promise<void>;
}
