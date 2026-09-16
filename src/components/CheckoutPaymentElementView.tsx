import React, { useState } from 'react';
import { getCheckoutPaymentElementId } from '../checkout/createCheckout';
import NativeCheckoutPaymentElement from '../specs/NativeCheckoutPaymentElement';
import type { CheckoutPaymentElementViewProps } from '../types/Checkout';

/**
 * Renders the Checkout-owned Payment Element inline and follows its native height.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export function CheckoutPaymentElementView({
  element,
  ...props
}: CheckoutPaymentElementViewProps): React.JSX.Element {
  const controllerId = getCheckoutPaymentElementId(element);
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
}: Omit<CheckoutPaymentElementViewProps, 'element'> & {
  controllerId: string;
}): React.JSX.Element {
  const [height, setHeight] = useState(1);
  return (
    <NativeCheckoutPaymentElement
      {...props}
      controllerId={controllerId}
      style={[{ height }, style]}
      onHeightChanged={({ nativeEvent }) => {
        setHeight(nativeEvent.height);
      }}
    />
  );
}
