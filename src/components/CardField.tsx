import type { CardFieldInput, Nullable } from '../types';
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

const CardFieldNative =
  requireNativeComponent<CardFieldInput.NativeProps>('CardField');

const unsupportedMethodMessage = (field: string) =>
  `${field} method is not supported. Consider to upgrade react-native version to 0.63.x or higher`;

const focusInput = (ref: React.MutableRefObject<any>) => {
  if ('focusInput' in TextInputState) {
    TextInputState.focusInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('focusInput'));
    }
  }
};

const registerInput = (ref: React.MutableRefObject<any>) => {
  if ('registerInput' in TextInputState) {
    TextInputState.registerInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('registerInput'));
    }
  }
};

const unregisterInput = (ref: React.MutableRefObject<any>) => {
  if ('unregisterInput' in TextInputState) {
    TextInputState.unregisterInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('unregisterInput'));
    }
  }
};

const currentlyFocusedInput = () => {
  if ('currentlyFocusedInput' in TextInputState) {
    return TextInputState.currentlyFocusedInput();
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('currentlyFocusedInput'));
    }
  }
};

/**
 *  Card Field Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  cardStyle?: CardFieldInput.Styles;
  placeholder?: CardFieldInput.Placeholders;
  autofocus?: boolean;
  onCardChange?(card: CardFieldInput.Details): void;
  onBlur?(): void;
  onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
  testID?: string;
  /**
   * WARNING: If set to `true` the full card number will be returned in the `onCardChange` handler.
   * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
   * Make sure that you're not mistakenly logging or storing full card details!
   * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
   */
  dangerouslyGetFullCardDetails?: boolean;
}

/**
 *  Card Field Component
 *
 * @example
 * ```ts
 * <CardField
 *    postalCodeEnabled={false}
 *    onCardChange={(cardDetails) => {
 *    console.log('card details', cardDetails);
 *      setCard(cardDetails);
 *    }}
 *    style={{height: 50}}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export const CardField = forwardRef<CardFieldInput.Methods, Props>(
  (
    {
      onCardChange,
      onFocus,
      onBlur,
      cardStyle,
      placeholder,
      postalCodeEnabled,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);

    const onCardChangeHandler = useCallback(
      (event: NativeSyntheticEvent<CardFieldInput.Details>) => {
        const card = event.nativeEvent;

        const data: CardFieldInput.Details = {
          last4: card.last4,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          complete: card.complete,
          brand: card.brand,
        };

        if (card.hasOwnProperty('postalCode')) {
          data.postalCode = card.postalCode || '';
        }
        if (card.hasOwnProperty('number')) {
          data.number = card.number || '';
          if (__DEV__ && onCardChange && card.complete) {
            console.warn(
              `[stripe-react-native] ⚠️ WARNING: You've enabled \`dangerouslyGetFullCardDetails\`, meaning full card details are being returned. Only do this if you're certain that you fulfill the necessary PCI compliance requirements. Make sure that you're not mistakenly logging or storing full card details! See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance`
            );
          }
        }
        onCardChange?.(data);
      },
      [onCardChange]
    );

    const onFocusHandler = useCallback(
      (event) => {
        const { focusedField } = event.nativeEvent;
        if (focusedField) {
          focusInput(inputRef.current);
          onFocus?.(focusedField);
        } else {
          onBlur?.();
        }
      },
      [onFocus, onBlur]
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

    const clear = () => {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(inputRef.current),
        'clear' as any,
        []
      );
    };

    useImperativeHandle(ref, () => ({
      focus,
      blur,
      clear,
    }));

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
      <CardFieldNative
        ref={inputRef}
        onCardChange={onCardChangeHandler}
        onFocusChange={onFocusHandler}
        postalCodeEnabled={postalCodeEnabled ?? true}
        cardStyle={{
          backgroundColor: cardStyle?.backgroundColor,
          borderColor: cardStyle?.borderColor,
          borderWidth: cardStyle?.borderWidth,
          borderRadius: cardStyle?.borderRadius,
          cursorColor: cardStyle?.cursorColor,
          fontSize: cardStyle?.fontSize,
          placeholderColor: cardStyle?.placeholderColor,
          textColor: cardStyle?.textColor,
          textErrorColor: cardStyle?.textErrorColor,
          fontFamily: cardStyle?.fontFamily,
        }}
        placeholder={{
          number: placeholder?.number,
          expiration: placeholder?.expiration,
          cvc: placeholder?.cvc,
          postalCode: placeholder?.postalCode,
        }}
        {...props}
      />
    );
  }
);
