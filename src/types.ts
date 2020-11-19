import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type CardDetails = {
  cardNumber: string;
  cvc: string;
  month: string;
  year: string;
  postalCode: string;
};

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  onCardChange(cartDetails: NativeSyntheticEvent<CardDetails>): void;
};
