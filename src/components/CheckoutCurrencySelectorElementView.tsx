import React, { useState } from 'react';
import { getCheckoutCurrencySelectorElementId } from '../checkout/createCheckout';
import NativeCheckoutCurrencySelectorElement from '../specs/NativeCheckoutCurrencySelectorElement';
import type { CheckoutCurrencySelectorElementViewProps } from '../types/Checkout';

/**
 * Renders the Checkout-owned Currency Selector Element inline and follows its
 * native height as disclosure and error content changes.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export function CheckoutCurrencySelectorElementView({
  element,
}: CheckoutCurrencySelectorElementViewProps): React.JSX.Element {
  const controllerId = getCheckoutCurrencySelectorElementId(element);
  return <MeasuredElement key={controllerId} controllerId={controllerId} />;
}

function MeasuredElement({
  controllerId,
}: {
  controllerId: string;
}): React.JSX.Element {
  const [height, setHeight] = useState(1);
  return (
    <NativeCheckoutCurrencySelectorElement
      controllerId={controllerId}
      style={{ height }}
      onHeightChanged={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
}
