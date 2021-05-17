import type { CardFieldInput, Nullable } from '../types';
import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';

const CardFieldNative = requireNativeComponent<CardFieldInput.NativeProps>(
  'CardField'
);

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
  onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
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
export function CardField({
  onCardChange,
  onFocus,
  cardStyle,
  placeholder,
  postalCodeEnabled,
  ...props
}: Props) {
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
      onCardChange?.(data);
    },
    [onCardChange]
  );

  const onFocusHandler = useCallback(
    (
      event: NativeSyntheticEvent<{
        focusedField: Nullable<CardFieldInput.Names>;
      }>
    ) => {
      onFocus?.(event.nativeEvent.focusedField);
    },
    [onFocus]
  );

  return (
    <CardFieldNative
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
