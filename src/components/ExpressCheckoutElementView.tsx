import React, { useState } from 'react';
import { getCheckoutExpressCheckoutElementId } from '../checkout/createCheckoutElements';
import NativeCheckoutExpressCheckoutElement from '../specs/NativeCheckoutExpressCheckoutElement';
import type { ExpressCheckoutElementViewProps } from '../types/CheckoutElements';

/**
 * Renders the Checkout-owned Express Checkout Element inline on iOS and Android.
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
