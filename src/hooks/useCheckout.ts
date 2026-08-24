import { useMemo } from 'react';
import type { Checkout } from '../types/Checkout';
import {
  createCheckoutNotImplementedError,
  createCheckoutNotImplementedStripeError,
} from '../checkout/errors';

const rejectNotImplemented = (): Promise<never> =>
  Promise.reject(createCheckoutNotImplementedError());

/**
 * Loads a Checkout Session and exposes its reactive state and controller
 * methods. The hook owns the native controller lifecycle.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export function useCheckout(options: Checkout.UseOptions): Checkout.UseResult {
  // TODO(porter): Implement the Checkout lifecycle with the native SDK.
  const enabled = options.enabled ?? true;

  return useMemo<Checkout.UseResult>(
    () => ({
      status: enabled ? 'error' : 'idle',
      session: null,
      paymentElement: null,
      error: enabled ? createCheckoutNotImplementedStripeError() : null,
      reload: rejectNotImplemented,
      updateEmail: rejectNotImplemented,
      updateShippingAddress: rejectNotImplemented,
      applyPromotionCode: rejectNotImplemented,
      removePromotionCode: rejectNotImplemented,
      runServerUpdate: rejectNotImplemented,
      clearPaymentOption: rejectNotImplemented,
      confirm: rejectNotImplemented,
    }),
    [enabled]
  );
}
