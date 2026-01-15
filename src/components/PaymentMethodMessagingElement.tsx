import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AccessibilityProps, HostComponent, LayoutAnimation, NativeSyntheticEvent, Platform } from 'react-native';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementResult,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { PaymentMethodMessagingElementConfiguration } from '../types/components/PaymentMethodMessagingElementComponent';
import NativePaymentMethodMessagingElement, { NativeProps } from '../specs/NativePaymentMethodMessagingElement';
import {
  registerInput,
  unregisterInput,
  currentlyFocusedInput,
} from '../helpers';
import { addListener } from '../events';
import NativeStripeSdkModule from '../specs/NativeStripeSdkModule';
import { UnsafeObject } from '../specs/utils';

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
  ({ appearance, configuration, onLoadComplete, ...props }, ref) => {
    const viewRef = useRef<React.ComponentRef<HostComponent<NativeProps>>>(null);

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
        // listen for height changes
        const sub = addListener(
          'paymentMethodMessagingElementDidUpdateHeight',
          ({ height: h }) => {
            // ignore zero
            //if (h > 0 || (isAndroid && h === 0)) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setHeight(h);
            //}
          }
        );
        return () => sub.remove();
      }, [isAndroid]);

    useEffect(() => {
      console.log("is this ever called?")
      console.log(configuration.amount)
      if (!isAndroid) {
        createElement(configuration)
      }
      //setConfig(configuration)
    }, [configuration])

    //const [config, setConfig] = useState(configuration)

    return (
      <NativePaymentMethodMessagingElement
        appearance={appearance}
        style={[{width: '100%', height: height}]}
        configuration={configuration}
        onLoadComplete={onLoadCompleteHandler}
        {...props}
        ref={viewRef}
      />
    );
  }
);

async function createElement(
  configuration: PaymentMethodMessagingElementConfiguration
): Promise<void> {
  await NativeStripeSdkModule.createPaymentMethodMessagingElement(configuration)
}

