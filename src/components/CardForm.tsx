import type { CardFormView } from '../types';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  UIManager,
  StyleProp,
  findNodeHandle,
  ViewStyle,
} from 'react-native';
const TextInputState = require('react-native/Libraries/Components/TextInput/TextInputState');

const CardFormNative =
  requireNativeComponent<CardFormView.NativeProps>('CardForm');

/**
 *  Card Form Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  autofocus?: boolean;
  testID?: string;

  // props iOS only
  cardStyle?: CardFormView.Styles;
  // isUserInteractionEnabled?: boolean;

  // TODO: will make it public when android-sdk allows for this
  // postalCodeEnabled?: boolean;

  // TODO: will make it public when ios-sdk allows for this
  // placeholder: CardFormView.Placeholders;
  // onBlur?(): void;
  // onFocus?(focusedField: Nullable<CardFormView.Names>): void;
  onFormComplete?(card: CardFormView.Details): void;
  /**
   * WARNING: If set to `true` the full card number will be returned in the `onFormComplete` handler.
   * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
   * Make sure that you're not mistakenly logging or storing full card details!
   * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
   */
  dangerouslyGetFullCardDetails?: boolean;
}

/**
 *  Card Form Component
 *
 * @example
 * ```ts
 * <CardForm
 *    onFormComplete={(cardDetails) => {
 *    console.log('card details', cardDetails);
 *      setCard(cardDetails);
 *    }}
 *    style={{height: 200}}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export const CardForm = forwardRef<CardFormView.Methods, Props>(
  (
    {
      onFormComplete,
      cardStyle,
      // isUserInteractionEnabled = true,
      // postalCodeEnabled = true,
      // onFocus,
      // onBlur,
      // placeholder,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);

    const onFormCompleteHandler = useCallback(
      (event: NativeSyntheticEvent<CardFormView.Details>) => {
        const card = event.nativeEvent;

        const data: CardFormView.Details = {
          last4: card.last4,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          complete: card.complete,
          brand: card.brand,
          country: card.country,
          postalCode: card.postalCode,
        };

        if (card.hasOwnProperty('number')) {
          data.number = card.number || '';
          if (__DEV__ && onFormComplete && card.complete) {
            console.warn(
              `[stripe-react-native] ⚠️ WARNING: You've enabled \`dangerouslyGetFullCardDetails\`, meaning full card details are being returned. Only do this if you're certain that you fulfill the necessary PCI compliance requirements. Make sure that you're not mistakenly logging or storing full card details! See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance`
            );
          }
        }
        onFormComplete?.(data);
      },
      [onFormComplete]
    );

    const focus = () => {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(inputRef.current),
        'focus' as any,
        []
      );
    };

    const blur = () => {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(inputRef.current),
        'blur' as any,
        []
      );
    };

    useImperativeHandle(ref, () => ({
      focus,
      blur,
    }));

    const onFocusHandler = useCallback((event) => {
      const { focusedField } = event.nativeEvent;
      if (focusedField) {
        TextInputState.focusInput(inputRef.current);
        // onFocus?.(focusedField);
      } else {
        // onBlur?.();
      }
    }, []);

    useLayoutEffect(() => {
      const inputRefValue = inputRef.current;
      if (inputRefValue !== null) {
        TextInputState.registerInput(inputRefValue);
        return () => {
          TextInputState.unregisterInput(inputRefValue);
          if (TextInputState.currentlyFocusedInput() === inputRefValue) {
            inputRefValue.blur();
          }
        };
      }
      return () => {};
    }, [inputRef]);

    return (
      <CardFormNative
        ref={inputRef}
        onFormComplete={onFormCompleteHandler}
        cardStyle={{
          backgroundColor: cardStyle?.backgroundColor,
          // disabledBackgroundColor: cardStyle?.disabledBackgroundColor,
          // type: cardStyle?.type,
        }}
        // isUserInteractionEnabledValue={isUserInteractionEnabled}
        // placeholder={{
        //   number: placeholder?.number,
        //   expiration: placeholder?.expiration,
        //   cvc: placeholder?.cvc,
        //   postalCode: placeholder?.postalCode,
        // }}
        onFocusChange={onFocusHandler}
        // postalCodeEnabled={postalCodeEnabled}
        {...props}
      />
    );
  }
);
