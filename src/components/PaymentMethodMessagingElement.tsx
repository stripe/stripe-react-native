import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityProps,
  HostComponent,
  LayoutAnimation,
  NativeSyntheticEvent,
  Platform,
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

/**
 *  Payment Method Messaging Element Component Props
 *
 * @example
 * ```tsx
 * <PaymentMethodMessagingElement
 *    appearance={{
 *      style: Style.Dark,
 *      textColor: '#FFFFFF',
 *      infoIconColor: '#CCCCCC',
 *      font: {
 *        family: 14,
 *      },
 *    }}
 *    configuration={{
 *      currencyCode: 'usd',
 *      amount: 5000,
 *      countryCode: 'US',
 *    }}
 *    onLoadComplete={(event) => {
 *      console.log('PMME loaded with result:', event);
 *    }
 * />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export const PaymentMethodMessagingElement = forwardRef<any, Props>(
  ({ appearance, configuration, onStateChange, ...props }) => {
    const viewRef =
      useRef<React.ComponentRef<HostComponent<NativeProps>>>(null);

    const isAndroid = Platform.OS === 'android';
    const [height, setHeight] = useState<number | undefined>();

    const onStateChangeHandler = useCallback(
      (
        event: NativeSyntheticEvent<{
          result: PaymentMethodMessagingElementState;
        }>
      ) => {
        onStateChange?.(event.nativeEvent.result);
      },
      [onStateChange]
    );

    useEffect(() => {
      // listen for height changes
      const sub = addListener(
        'paymentMethodMessagingElementDidUpdateHeight',
        ({ height: h }) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setHeight(h);
        }
      );
      return () => sub.remove();
    }, [isAndroid]);

    useEffect(() => {
      // listen for load complete
      const sub = addListener(
        'paymentMethodMessagingElementConfigureResult',
        ({ status: s }) => {
          let state: PaymentMethodMessagingElementState;

          if (s === 'loaded') {
            state = { status: 'loaded' };
          } else if (s === 'loading') {
            state = { status: 'loading' };
          } else if (s === 'no_content') {
            state = { status: 'no_content' };
          } else {
            state = {
              status: 'failed',
              error: new Error(
                'Failed to configure payment method messaging element'
              ),
            };
          }

          onStateChange?.(state);
        }
      );
      return () => sub.remove();
    }, [isAndroid, onStateChange]);

    return (
      <NativePaymentMethodMessagingElement
        appearance={appearance}
        style={[{ width: '100%', height: height }]}
        configuration={configuration}
        onStateChange={onStateChangeHandler}
        {...props}
        ref={viewRef}
      />
    );
  }
);
