import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AccessibilityProps, LayoutAnimation, NativeSyntheticEvent, Platform } from 'react-native';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementResult,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { PaymentMethodMessagingElementConfiguration } from '../types/components/PaymentMethodMessagingElementComponent';
import NativePaymentMethodMessagingElement from '../specs/NativePaymentMethodMessagingElement';
import {
  registerInput,
  unregisterInput,
  currentlyFocusedInput,
} from '../helpers';
import { addListener } from '../events';

export interface Props extends AccessibilityProps {
  appearance?: PaymentMethodMessagingElementAppearance;
  configuration: PaymentMethodMessagingElementConfiguration;
  onLoadComplete?(event: PaymentMethodMessagingElementResult): void;
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
 *        size: 14,
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
  // implemenation details
  ({ appearance, configuration, onLoadComplete, ...props }, ref) => {
    const inputRef = useRef<any>(null);

    useImperativeHandle(ref, () => inputRef.current, []);

    const isAndroid = Platform.OS === 'android';
    const [height, setHeight] = useState<number | undefined>();

    const onLoadCompleteHandler = useCallback(
      (
        event: NativeSyntheticEvent<{
          result: PaymentMethodMessagingElementResult;
        }>
      ) => {
        console.log("is this being called?")
        onLoadComplete?.(event.nativeEvent.result);
      },
      [onLoadComplete]
    );

    useEffect(() => {
        const sub = addListener(
          'paymentMethodMessagingElementDidUpdateHeight',
          ({ height: h }) => {
            // ignore zero
            if (h > 0 || (isAndroid && h === 0)) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setHeight(h);
            }
          }
        );
        return () => sub.remove();
      }, [isAndroid]);

    useLayoutEffect(() => {
      const inputRefValue = inputRef.current;
      if (inputRefValue !== null) {
        registerInput(inputRefValue);
        return () => {
          unregisterInput(inputRefValue);
          if (currentlyFocusedInput() === inputRefValue) {
            inputRefValue.blur();
          }
        };
      }
      return () => {};
    }, [inputRef]);

    return (
      <NativePaymentMethodMessagingElement
        appearance={appearance}
        style={[{width: '100%', height: height}]}
        configuration={configuration}
        onLoadComplete={onLoadCompleteHandler}
        {...props}
        ref={inputRef}
      />
    );
  }
);

