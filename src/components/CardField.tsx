import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type {
  CardFieldProps,
  Nullable,
  FocusFieldNames,
  CardDetails,
} from '../types';

const CardFieldNative = requireNativeComponent<CardFieldProps>('CardField');

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  onCardChange?(card: CardDetails): void;
  onFocus?(focusedField: Nullable<FocusFieldNames>): void;
};

type NativeCardDetails = CardDetails & {
  number: string;
  cvc: string;
};

export const CardField: React.FC<Props> = ({
  onCardChange,
  onFocus,
  ...props
}) => {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<NativeCardDetails>) => {
      const card = event.nativeEvent;

      console.warn(
        '[stripe-react-native] Caution! Remember that you should never send card details to your servers!'
      );

      const data: NativeCardDetails = {
        last4: card.last4 || (card.number || '').slice(card.number.length - 4),
        number: card.number || '',
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
      event: NativeSyntheticEvent<{ focusedField: Nullable<FocusFieldNames> }>
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
