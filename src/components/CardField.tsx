import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type {
  CardDetails,
  CardFieldProps,
  Nullable,
  FocusFieldNames,
} from '../types';

const CardFieldNative = requireNativeComponent<CardFieldProps>('CardField');

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  defaultValue?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange?(card: CardDetails): void;
  onFocus?(focusedField: Nullable<FocusFieldNames>): void;
};

export const CardField: React.FC<Props> = ({
  onCardChange,
  onFocus,
  ...props
}) => {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<CardDetails>) => {
      const card = event.nativeEvent;
      const data: CardDetails = {
        last4: card.last4 || '',
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
