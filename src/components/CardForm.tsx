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
import NativeCardForm, { Commands } from '../specs/NativeCardForm';
import {
  currentlyFocusedInput,
  focusInput,
  registerInput,
  unregisterInput,
} from '../helpers';
import type { CardBrand, CardFormView } from '../types';

/**
 *  Card Form Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  autofocus?: boolean;
  testID?: string;
  /** Applies a disabled state such that user input is not accepted. Defaults to false. */
  disabled?: boolean;
  /** All styles except backgroundColor, cursorColor, borderColor, and borderRadius are Android only */
  cardStyle?: CardFormView.Styles;
  /** The list of preferred networks that should be used to process payments made with a co-branded card.
   * This value will only be used if your user hasn't selected a network themselves. */
  preferredNetworks?: Array<CardBrand>;
  // TODO: will make it public when iOS SDK allows for this
  // postalCodeEnabled?: boolean;

  /** Android only */
  placeholders?: CardFormView.Placeholders;
  /** Android only */
  defaultValues?: CardFormView.DefaultValues;
  // onBlur?(): void;
  // onFocus?(focusedField: CardFormView.FieldNames | null): void;
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
      placeholders,
      defaultValues,
      autofocus,
      dangerouslyGetFullCardDetails,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);

    const onFormCompleteHandler = useCallback(
      (event: NativeSyntheticEvent<{ card: CardFormView.Details }>) => {
        const card = event.nativeEvent.card;

        const data: CardFormView.Details = {
          last4: card.last4,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          complete: card.complete,
          brand: card.brand,
          country: card.country,
          postalCode: card.postalCode,
        };

        if (card.hasOwnProperty('number') || card.hasOwnProperty('cvc')) {
          data.number = card.number || '';
          data.cvc = card.cvc || '';
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
      Commands.focus(inputRef.current);
    };

    const blur = () => {
      Commands.blur(inputRef.current);
    };

    useImperativeHandle(ref, () => ({
      focus,
      blur,
    }));

    const onFocusHandler = useCallback(
      (event: CardFormView.OnFocusChangeEvent) => {
        const { focusedField } = event.nativeEvent;
        if (focusedField) {
          focusInput(inputRef.current);
        }
      },
      []
    );

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
      <NativeCardForm
        ref={inputRef}
        onFormComplete={onFormCompleteHandler}
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
        defaultValues={{
          ...(defaultValues ?? {}),
        }}
        onFocusChange={onFocusHandler}
        autofocus={autofocus ?? false}
        dangerouslyGetFullCardDetails={dangerouslyGetFullCardDetails ?? false}
        disabled={disabled ?? false}
        postalCodeEnabled
        {...props}
      />
    );
  }
);
