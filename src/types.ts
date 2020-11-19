import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type CardDetails = {
  cardNumber: string;
  cvc: string;
  expiryDate: string;
};

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocus(event: NativeSyntheticEvent<{ focusField: string }>): void;
};
