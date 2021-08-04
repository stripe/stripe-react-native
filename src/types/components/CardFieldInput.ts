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
    /**
     * WARNING: Full card details are only returned when the `dangerouslyGetFullCardDetails` prop
     * on the `CardField` component is set to `true`.
     * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
     * Make sure that you're not mistakenly logging or storing full card details!
     * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
     */
    number?: string;
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
    fontFamily?: string;
  }

  export interface Placeholders {
    number?: string;
    expiration?: string;
    cvc?: string;
    postalCode?: string;
  }

  /**
   * @ignore
   */
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

  export interface Methods {
    focus(): void;
    blur(): void;
    clear(): void;
  }
}
