import React, { useState } from 'react';
import { Platform } from 'react-native';
import { getCheckoutExpressCheckoutElementId } from '../checkout/createCheckoutElements';
import NativeCheckoutExpressCheckoutElement from '../specs/NativeCheckoutExpressCheckoutElement';
import type { ExpressCheckoutElementViewProps } from '../types/CheckoutElements';

/**
 * Renders the Checkout-owned Express Checkout Element inline on Android.
 * The iOS bridge is not yet implemented.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @internal
 * @CheckoutSessionPrivatePreview
 */
export function ExpressCheckoutElementView({
  element,
}: ExpressCheckoutElementViewProps): React.JSX.Element {
  if (Platform.OS !== 'android') {
    throw new Error(
      'This version of @stripe/stripe-react-native does not include native support for Express Checkout Element.'
    );
  }
  const controllerId = getCheckoutExpressCheckoutElementId(element);
  return <MeasuredElement key={controllerId} controllerId={controllerId} />;
}

function MeasuredElement({
  controllerId,
}: {
  controllerId: string;
}): React.JSX.Element {
  const [height, setHeight] = useState(1);
  return (
    <NativeCheckoutExpressCheckoutElement
      controllerId={controllerId}
      style={{ width: '100%', height }}
      onHeightChanged={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
}

/**
 * Alias for the Checkout-owned Express Checkout Element view.
 * @internal
 * @CheckoutSessionPrivatePreview
 */
export const CheckoutExpressCheckoutElementView = ExpressCheckoutElementView;
