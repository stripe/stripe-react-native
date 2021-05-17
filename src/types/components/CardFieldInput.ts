import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { Nullable } from '../';

export namespace CardFieldInput {
  export type Names = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

  export interface Details {
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    postalCode?: string;
    brand: Brand;
    complete: boolean;
  }

  export interface Styles {
    borderWidth?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    textColor?: string;
    fontSize?: number;
    placeholderColor?: string;
    cursorColor?: string;
    textErrorColor?: string;
  }

  export interface Placeholders {
    number?: string;
    expiration?: string;
    cvc?: string;
    postalCode?: string;
  }

  export type Brand =
    | 'AmericanExpress'
    | 'DinersClub'
    | 'Discover'
    | 'JCB'
    | 'MasterCard'
    | 'UnionPay'
    | 'Visa'
    | 'Unknown';

  export interface NativeProps {
    style?: StyleProp<ViewStyle>;
    value?: Partial<Details>;
    postalCodeEnabled?: boolean;
    autofocus?: boolean;
    onCardChange(event: NativeSyntheticEvent<Details>): void;
    onFocusChange(
      event: NativeSyntheticEvent<{ focusedField: Nullable<Names> }>
    ): void;
    cardStyle?: Styles;
    placeholder?: Placeholders;
  }
}
