import type { Checkout, CheckoutController } from '../types/Checkout';
import { createCheckoutNotImplementedError } from './errors';

/**
 * Creates a controller for one Checkout Session. The caller owns the
 * controller lifecycle and must destroy it when it is no longer needed.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export async function createCheckout(
  _options: Checkout.CreateOptions
): Promise<CheckoutController> {
  // TODO(porter): Create the Checkout controller with the native SDK.
  throw createCheckoutNotImplementedError();
}
