import type { BillingDetails } from './Common';
import type { FutureUsage } from './PaymentIntent';
import type { Type as PaymentMethodType } from './PaymentMethod';

/**
 * ConfirmationToken result type.
 *
 * @internal DO NOT USE - This API is under active development and is not ready for use.
 * The API is subject to breaking changes without notice. Do not use in production or development.
 */
export interface Result {
  /** Unique identifier for the object (e.g. `ctoken_...`). */
  id: string;

  /** Time at which the object was created. Measured in seconds since the Unix epoch. */
  created: number;

  /** Time at which this ConfirmationToken expires and can no longer be used to confirm a PaymentIntent or SetupIntent. */
  expiresAt?: number;

  /** `true` if the object exists in live mode or the value `false` if the object exists in test mode. */
  liveMode: boolean;

  /** ID of the PaymentIntent this token was used to confirm. */
  paymentIntentId?: string;

  /** ID of the SetupIntent this token was used to confirm. */
  setupIntentId?: string;

  /** Return URL used to confirm the intent for redirect-based methods. */
  returnURL?: string;

  /** Indicates intent to reuse the payment method. */
  setupFutureUsage?: FutureUsage;

  /** Non-PII preview of payment details captured by the Payment Element. */
  paymentMethodPreview?: PaymentMethodPreview;

  /** Shipping information collected on this token. */
  shipping?: ShippingDetails;

  /** All response fields from the API, including any additional or undocumented fields. */
  allResponseFields: Record<string, any>;
}

/**
 * Preview of payment method details captured by the ConfirmationToken.
 * This represents the transactional checkout state, not a reusable PaymentMethod object.
 */
export interface PaymentMethodPreview {
  /** Type of the payment method. */
  type: PaymentMethodType;

  /** Billing details for the payment method. */
  billingDetails?: BillingDetails;

  /** This field indicates whether this payment method can be shown again to its customer in a checkout flow */
  allowRedisplay?: AllowRedisplay;

  /** The ID of the Customer to which this PaymentMethod is saved. Null when the PaymentMethod has not been saved to a Customer. */
  customerId?: string;

  /** All response fields from the API, including any additional or undocumented fields. */
  allResponseFields: Record<string, any>;
}

export type AllowRedisplay = 'always' | 'limited' | 'unspecified';

export interface ShippingDetails {
  /** The recipient's address. */
  address: BillingDetails['address'];
  /** The recipient's name. */
  name?: string;
  /** The recipient's phone (including extension). */
  phone?: string;
}
