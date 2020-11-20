import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type CardDetails = {
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
};

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocus(event: NativeSyntheticEvent<{ focusField: string }>): void;
};

export type Intent = {
  id: string;
  amount: number;
  created: string;
  currency: string;
  status: string;
  description?: string;
  receiptEmail?: string;
};
