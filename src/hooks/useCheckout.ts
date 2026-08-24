import { useMemo } from 'react';
import type { Checkout } from '../types/Checkout';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';

const checkoutNotImplementedStripeError: NonNullable<
  Checkout.UseResult['error']
> = {
  code: 'Failed',
  message: CHECKOUT_NOT_IMPLEMENTED_MESSAGE,
};

const rejectNotImplemented = (): Promise<never> =>
  Promise.reject(new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE));

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
      error: enabled ? checkoutNotImplementedStripeError : null,
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
