import type React from 'react';
import type { CheckoutPaymentElementViewProps } from '../types/Checkout';
import { createCheckoutNotImplementedError } from '../checkout/errors';

/**
 * Renders the Checkout-owned Payment Element inline.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export function CheckoutPaymentElementView(
  _props: CheckoutPaymentElementViewProps
): React.JSX.Element {
  // TODO(porter): Render Checkout Payment Element with a native component.
  throw createCheckoutNotImplementedError();
}
