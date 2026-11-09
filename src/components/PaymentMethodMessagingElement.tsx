import React, { useCallback, useState } from 'react';
import {
  AccessibilityProps,
  LayoutAnimation,
  NativeSyntheticEvent,
} from 'react-native';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementState,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { PaymentMethodMessagingElementConfiguration } from '../types/components/PaymentMethodMessagingElementComponent';
import NativePaymentMethodMessagingElement from '../specs/NativePaymentMethodMessagingElement';

export interface Props extends AccessibilityProps {
  appearance?: PaymentMethodMessagingElementAppearance;
  configuration: PaymentMethodMessagingElementConfiguration;
  onStateChange?(event: PaymentMethodMessagingElementState): void;
}

const GENERIC_CONFIGURE_FAILED_MESSAGE =
  'Failed to configure payment method messaging element';

type ConfigureResultPayload = {
  status?: string;
  message?: string;
  code?: string;
  viewTag?: number;
  error?: { message?: string; code?: string };
};

function failedStateFromPayload(payload: ConfigureResultPayload): {
  status: 'failed';
  error: Error;
} {
  const message =
    payload.message ??
    payload.error?.message ??
    GENERIC_CONFIGURE_FAILED_MESSAGE;
  const error = new Error(message);
  const code = payload.code ?? payload.error?.code;
  if (code != null) {
    (error as Error & { code?: string }).code = code;
  }
  return { status: 'failed', error };
}

/**
 * This feature is in Public Preview. It may not be feature complete and have breaking changes as we develop and update functionality.
 * Payment Method Messaging Element to display promotional information about available BNPL plans.
 *
 * @example
 * ```tsx
 * <PaymentMethodMessagingElement
 *    appearance={{
 *      style: PaymentMethodMessagingElementStyle.Dark,
 *      textColor: '#FFFFFF',
 *      font: {
 *        family: 'Courier',
 *        size: 16,
 *      },
 *    }}
 *    configuration={{
 *      currency: 'usd',
 *      amount: 5000,
 *      country: 'US',
 *    }}
 *    onStateChange={(event) => {
 *      console.log('PMME loaded with result:', event);
 *    }}
 * />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export const PaymentMethodMessagingElement = ({
  appearance,
  configuration,
  onStateChange,
  ...props
}: Props) => {
  const [height, setHeight] = useState<number | undefined>();

  const onHeightChanged = useCallback(
    (
      event: NativeSyntheticEvent<{
        height?: number;
      }>
    ) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHeight(event.nativeEvent.height);
    },
    []
  );

  const onConfigureResult = useCallback(
    (event: NativeSyntheticEvent<{ result: ConfigureResultPayload }>) => {
      const payload = event.nativeEvent.result;
      let state: PaymentMethodMessagingElementState;
      const s = payload.status;
      if (s === 'loaded') {
        state = { status: 'loaded' };
      } else if (s === 'loading') {
        state = { status: 'loading' };
      } else if (s === 'no_content') {
        state = { status: 'no_content' };
      } else {
        state = failedStateFromPayload(payload);
      }
      onStateChange?.(state);
    },
    [onStateChange]
  );

  return (
    <NativePaymentMethodMessagingElement
      onConfigureResult={onConfigureResult}
      onHeightChanged={onHeightChanged}
      appearance={appearance}
      style={[{ width: '100%', height: height }]}
      configuration={configuration}
      {...props}
    />
  );
};
