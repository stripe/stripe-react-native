import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityProps,
  findNodeHandle,
  HostComponent,
  LayoutAnimation,
} from 'react-native';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementState,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { PaymentMethodMessagingElementConfiguration } from '../types/components/PaymentMethodMessagingElementComponent';
import NativePaymentMethodMessagingElement, {
  NativeProps,
} from '../specs/NativePaymentMethodMessagingElement';
import { addListener } from '../events';

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

function isForView(
  payload: { viewTag?: number },
  viewTag: number | null
): boolean {
  if (payload.viewTag == null) {
    return true;
  }
  if (viewTag == null) {
    return false;
  }
  return payload.viewTag === viewTag;
}

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
  const viewRef = useRef<React.ComponentRef<HostComponent<NativeProps>>>(null);
  const viewTagRef = useRef<number | null>(null);

  const [height, setHeight] = useState<number | undefined>();

  const assignRef = useCallback(
    (node: React.ComponentRef<HostComponent<NativeProps>> | null) => {
      viewRef.current = node;
      viewTagRef.current = node != null ? findNodeHandle(node) : null;
    },
    []
  );

  useEffect(() => {
    const sub = addListener(
      'paymentMethodMessagingElementDidUpdateHeight',
      (payload: { height?: number; viewTag?: number }) => {
        if (!isForView(payload, viewTagRef.current)) {
          return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHeight(payload.height);
      }
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = addListener(
      'paymentMethodMessagingElementConfigureResult',
      (payload: ConfigureResultPayload) => {
        if (!isForView(payload, viewTagRef.current)) {
          return;
        }
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
      }
    );
    return () => sub.remove();
  }, [onStateChange]);

  return (
    <NativePaymentMethodMessagingElement
      appearance={appearance}
      style={[{ width: '100%', height: height }]}
      configuration={configuration}
      {...props}
      ref={assignRef}
    />
  );
};
