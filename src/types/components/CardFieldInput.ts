import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { Nullable } from '../';

export declare namespace CardFieldInput {
  export type Names = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

  export interface Details {
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    postalCode?: string;
    brand: Brand;
    complete: boolean;
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
    onCardChange(event: NativeSyntheticEvent<Details>): void;
    onFocusChange(
      event: NativeSyntheticEvent<{ focusedField: Nullable<Names> }>
    ): void;
  }
}
