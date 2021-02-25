import type { CardFieldInput } from '@stripe/stripe-react-native';
import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { Nullable } from '@stripe/stripe-react-native';

const CardFieldNative = requireNativeComponent<CardFieldInput.Props>(
  'CardField'
);

export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  onCardChange?(card: CardFieldInput.Details): void;
  onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
}

type NativeCardDetails = CardFieldInput.Details & {
  number: string;
  cvc: string;
};

/**
 *  Card Field component
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
export function CardField({ onCardChange, onFocus, ...props }: Props) {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<NativeCardDetails>) => {
      const card = event.nativeEvent;

      if (__DEV__ && card.complete) {
        console.warn(
          '[stripe-react-native] Caution! Never send card details to your server!'
        );
      }

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
      {...props}
    />
  );
}
