import type React from 'react';
import type { CheckoutPaymentElementViewProps } from '../types/Checkout';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';

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
  throw new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
}
