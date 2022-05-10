import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { CardBrand } from '../Token';

export type FieldName = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

export interface Details {
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  postalCode?: string;
  brand: CardBrand;
  complete: boolean;
  country: string;
  /**
   * WARNING: Full card details are only returned when the `dangerouslyGetFullCardDetails` prop
   * on the `CardField` component is set to `true`.
   * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
   * Make sure that you're not mistakenly logging or storing full card details!
   * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
   */
  number?: string;
  cvc?: string;
}

export interface Styles {
  backgroundColor?: string;
  // disabledBackgroundColor?: string;
  // type?: 'borderless' | 'standard';
  borderWidth?: number;
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
  autofocus?: boolean;
  // isUserInteractionEnabledValue?: boolean;
  cardStyle?: Styles;
  /** Android only */
  placeholders?: Placeholders;
  // postalCodeEnabled: boolean;
  onFocusChange(
    event: NativeSyntheticEvent<{ focusedField: FieldName | null }>
  ): void;
  onFormComplete(event: NativeSyntheticEvent<Details>): void;
}

export interface Methods {
  focus(): void;
  blur(): void;
}
