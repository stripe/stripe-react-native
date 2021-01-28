declare module '@stripe/stripe-react-native' {
  namespace CardFieldInput {
    export type Names = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

    export interface Details {
      number: string;
      cvc: string;
      expiryMonth: number;
      expiryYear: number;
      postalCode?: string;
    }

    export interface Props {
      style?: StyleProp<ViewStyle>;
      value?: Partial<CardDetails>;
      postalCodeEnabled?: boolean;
      onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
      onFocusChange(
        event: NativeSyntheticEvent<{ focusedField: Nullable<FocusFieldNames> }>
      ): void;
    }
  }
}
