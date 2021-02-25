import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

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
      value?: Partial<Details>;
      postalCodeEnabled?: boolean;
      onCardChange(event: NativeSyntheticEvent<Details>): void;
      onFocusChange(
        event: NativeSyntheticEvent<{ focusedField: Nullable<Names> }>
      ): void;
    }
  }
}
