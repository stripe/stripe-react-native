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

export type OnFocusChangeEvent = NativeSyntheticEvent<{
  focusedField: FieldName | null;
}>;

export type OnCardChangeEvent = NativeSyntheticEvent<{ card: Details }>;

/**
 * @ignore
 */
export interface NativeProps {
  style?: StyleProp<ViewStyle>;
  postalCodeEnabled?: boolean;
  autofocus?: boolean;
  countryCode: string | null;
  onCardChange(event: OnCardChangeEvent): void;
  onFocusChange(event: OnFocusChangeEvent): void;
  cardStyle?: Styles;
  placeholders?: Placeholders;
  disabled?: boolean;
}

export interface Methods {
  focus(): void;
  blur(): void;
  clear(): void;
}
