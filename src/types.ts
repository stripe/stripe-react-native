import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type CardDetails = {
  cardNumber: string;
  cvc: string;
  expiryYear: number;
  expiryMonth: number;
};

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocus(event: NativeSyntheticEvent<{ focusField: string }>): void;
};
