import type React from 'react';
import type { ExpressCheckoutElementViewProps } from '../types/CheckoutElements';

/**
 * Renders the Checkout-owned Express Checkout Element inline.
 *
 * @remarks
 * This API is in private preview and can change without notice. Native support
 * for Express Checkout Element is not implemented in this version.
 *
 * @internal
 * @CheckoutSessionPrivatePreview
 */
export function ExpressCheckoutElementView(
  _props: ExpressCheckoutElementViewProps
): React.JSX.Element {
  // TODO: Render the Checkout-owned Express Checkout Element with a native component.
  throw new Error(
    'This version of @stripe/stripe-react-native does not include native support for Express Checkout Element.'
  );
}

/**
 * Alias for the Checkout-owned Express Checkout Element view.
 * @internal
 * @CheckoutSessionPrivatePreview
 */
export const CheckoutExpressCheckoutElementView = ExpressCheckoutElementView;
