import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { CardFieldInput, Nullable } from '@stripe/stripe-react-native';

const CardFieldNative = requireNativeComponent<CardFieldInput.Props>(
  'CardField'
);

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  defaultValue?: Partial<CardFieldInput.Details>;
  postalCodeEnabled?: boolean;
  onCardChange?(card: CardFieldInput.Details): void;
  onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
};

export const CardField: React.FC<Props> = ({
  onCardChange,
  onFocus,
  ...props
}) => {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<CardFieldInput.Details>) => {
      const card = event.nativeEvent;
      const data: CardFieldInput.Details = {
        number: card.number || '',
        cvc: card.cvc || '',
        expiryMonth: card.expiryMonth || 0,
        expiryYear: card.expiryYear || 0,
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
};
