import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { CardBrand } from '../Token';

export type FieldName = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';

export enum ValidationState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Incomplete = 'Incomplete',
  Unknown = 'Unknown',
}

export interface Details {
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  postalCode?: string;
  brand: CardBrand;
  complete: boolean;
  validExpiryDate: ValidationState;
  validCVC: ValidationState;
  validNumber: ValidationState;
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
  countryCode: string | null;
  onCardChange(event: NativeSyntheticEvent<Details>): void;
  onFocusChange(
    event: NativeSyntheticEvent<{ focusedField: FieldName | null }>
  ): void;
  cardStyle?: Styles;
  placeholders?: Placeholders;
}

export interface Methods {
  focus(): void;
  blur(): void;
  clear(): void;
}

export type DefaultCardValues = {
  /** The month of expiry of the card. This should be a 1 or 2 digit string, e.g. "2" or "12". */
  expiryMonth?: string;
  /** The year of expiry of the card. This should be a 2 or 4 digit string, e.g. "25" or "2025". */
  expiryYear?: string;
  /** The postal code associated with the card. */
  postalCode?: string;
  /** The 16-digit card number (can be just a portion of it). */
  number?: string;
  /** The 3-digit cvc of the card. */
  cvc?: string;
};
