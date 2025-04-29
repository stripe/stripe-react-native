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
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  currentlyFocusedInput,
  focusInput,
  registerInput,
  unregisterInput,
} from '../helpers';
import NativeCardField, {
  Commands,
  FocusChangeEvent,
} from '../specs/NativeCardField';
import type { CardBrand, CardFieldInput } from '../types';

/**
 *  Card Field Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  /** Controls if a postal code entry field can be displayed to the user. If true, the type of code entry shown is controlled by the set countryCode prop. Some country codes may result in no postal code entry being shown if those countries do not commonly use postal codes. If false, no postal code entry will ever be displayed. Defaults to true.*/
  postalCodeEnabled?: boolean;
  /** Controls the postal code entry shown (if the postalCodeEnabled prop is set to true). Defaults to the device's default locale. */
  countryCode?: string;
  /** Applies a disabled state such that user input is not accepted. Defaults to false. */
  disabled?: boolean;
  cardStyle?: CardFieldInput.Styles;
  placeholders?: CardFieldInput.Placeholders;
  autofocus?: boolean;
  onCardChange?(card: CardFieldInput.Details): void;
  onBlur?(): void;
  onFocus?(focusedField: CardFieldInput.FieldName | null): void;
  testID?: string;
  /** The list of preferred networks that should be used to process payments made with a co-branded card.
   * This value will only be used if your user hasn't selected a network themselves. */
  preferredNetworks?: Array<CardBrand>;
  /** The account (if any) for which the funds of the intent are intended. */
  onBehalfOf?: string;
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
      placeholders,
      autofocus,
      postalCodeEnabled,
      disabled,
      dangerouslyGetFullCardDetails,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);

    const onCardChangeHandler = useCallback(
      (event: NativeSyntheticEvent<{ card: CardFieldInput.Details }>) => {
        const card = event.nativeEvent.card;

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
        if (card.hasOwnProperty('number') || card.hasOwnProperty('cvc')) {
          data.number = card.number || '';
          data.cvc = card.cvc || '';
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
      (event: NativeSyntheticEvent<FocusChangeEvent>) => {
        const { focusedField } = event.nativeEvent;
        if (focusedField) {
          focusInput(inputRef.current);
          onFocus?.(focusedField as CardFieldInput.FieldName);
        } else {
          onBlur?.();
        }
      },
      [onFocus, onBlur]
    );

    const focus = () => {
      Commands.focus(inputRef.current);
    };

    const blur = () => {
      Commands.blur(inputRef.current);
    };

    const clear = () => {
      Commands.clear(inputRef.current);
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
      <NativeCardField
        ref={inputRef}
        onCardChange={onCardChangeHandler}
        onFocusChange={onFocusHandler}
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
        placeholders={{
          number: placeholders?.number,
          expiration: placeholders?.expiration,
          cvc: placeholders?.cvc,
          postalCode: placeholders?.postalCode,
        }}
        autofocus={autofocus ?? false}
        postalCodeEnabled={postalCodeEnabled ?? true}
        disabled={disabled ?? false}
        dangerouslyGetFullCardDetails={dangerouslyGetFullCardDetails ?? false}
        {...props}
      />
    );
  }
);
