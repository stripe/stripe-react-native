import type { CardFieldInput } from '../types';
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
import {
  currentlyFocusedInput,
  focusInput,
  registerInput,
  unregisterInput,
} from '../helpers';

const CardFieldNative =
  requireNativeComponent<CardFieldInput.NativeProps>('CardField');

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
  onFocus?(focusedField: CardFieldInput.FieldName | null): void;
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
          validExpiryDate: card.validExpiryDate,
          validNumber: card.validNumber,
          validCVC: card.validCVC,
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
