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
  ...props
}: CheckoutCurrencySelectorElementViewProps): React.JSX.Element {
  const controllerId = getCheckoutCurrencySelectorElementId(element);
  return (
    <MeasuredElement
      key={controllerId}
      controllerId={controllerId}
      {...props}
    />
  );
}

function MeasuredElement({
  controllerId,
  style,
  ...props
}: Omit<CheckoutCurrencySelectorElementViewProps, 'element'> & {
  controllerId: string;
}): React.JSX.Element {
  const [height, setHeight] = useState(1);
  return (
    <NativeCheckoutCurrencySelectorElement
      {...props}
      controllerId={controllerId}
      style={[{ height }, style]}
      onHeightChanged={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
}
