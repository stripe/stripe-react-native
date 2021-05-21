import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { Nullable } from '../';
import type { Card } from '../Card';

export namespace CardFieldInput {
  export type Names = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

  export interface Details {
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    postalCode?: string;
    brand: Card.Brand;
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
