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
  onCardChange?(card: CardFieldInput.Details): void;
  onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
}

type NativeCardDetails = CardFieldInput.Details & {
  number: string;
  cvc: string;
};

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
  ...props
}: Props) {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<NativeCardDetails>) => {
      const card = event.nativeEvent;
      const cardNumber = card.number || '';
      const last4 =
        cardNumber.length >= 4 ? cardNumber.slice(cardNumber.length - 4) : '';

      const data: NativeCardDetails = {
        last4: card.last4 || last4,
        number: cardNumber,
        cvc: card.cvc || '',
        expiryMonth: card.expiryMonth || 0,
        expiryYear: card.expiryYear || 0,
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
      cardStyle={{
        backgroundColor: cardStyle?.backgroundColor || '#FFFFFF',
        borderColor: cardStyle?.borderColor || '#000000',
        borderWidth: cardStyle?.borderWidth || 2,
        cornerRadius: cardStyle?.cornerRadius || 16,
        cursorColor: cardStyle?.cursorColor || '#FFFFFF',
        fontSize: cardStyle?.fontSize || 16,
        placeholderColor: cardStyle?.placeholderColor || '#000000',
        textColor: cardStyle?.textColor || '#000000',
        textErrorColor: cardStyle?.textErrorColor || '#8a000b',
      }}
      {...props}
    />
  );
}
