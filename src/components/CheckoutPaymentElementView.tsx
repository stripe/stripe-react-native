import React, { useState } from 'react';
import { LayoutAnimation } from 'react-native';
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
}: CheckoutPaymentElementViewProps): React.JSX.Element {
  const controllerId = getCheckoutPaymentElementId(element);
  return <MeasuredElement key={controllerId} controllerId={controllerId} />;
}

function MeasuredElement({
  controllerId,
}: {
  controllerId: string;
}): React.JSX.Element {
  const [height, setHeight] = useState(1);
  return (
    <NativeCheckoutPaymentElement
      controllerId={controllerId}
      style={{ width: '100%', height }}
      onHeightChanged={({ nativeEvent }) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHeight(nativeEvent.height);
      }}
    />
  );
}
