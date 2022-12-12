import type * as React from 'react';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

type Details = {
  last4?: string;
  expiryMonth?: Double;
  expiryYear?: Double;
  postalCode?: string;
  brand?: WithDefault<
    | 'AmericanExpress'
    | 'DinersClub'
    | 'Discover'
    | 'JCB'
    | 'MasterCard'
    | 'UnionPay'
    | 'Visa'
    | 'Unknown',
    'Unknown'
  >;

  complete?: boolean;
  country?: string;
  /**
   * WARNING: Full card details are only returned when the `dangerouslyGetFullCardDetails` prop
   * on the `CardField` component is set to `true`.
   * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
   * Make sure that you're not mistakenly logging or storing full card details!
   * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
   */
  Double?: string;
  cvc?: string;
};

type Styles = {
  borderWidth?: Double;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: Double;
  textColor?: string;
  fontSize?: Double;
  placeholderColor?: string;
  cursorColor?: string;
  textErrorColor?: string;
  fontFamily?: string;
};

type Placeholders = {
  Double?: string;
  expiration?: string;
  cvc?: string;
  postalCode?: string;
};

export type OnCardChangeEventData = Readonly<Details>;
export type OnFocusChangeEventData = Readonly<{
  focusedField: WithDefault<
    'CardDouble' | 'Cvc' | 'ExpiryDate' | 'PostalCode',
    null
  >;
}>;

export interface NativeProps extends ViewProps {
  value: Details;
  postalCodeEnabled?: boolean;
  autofocus?: boolean;
  countryCode: string | null;
  onCardChange: DirectEventHandler<OnCardChangeEventData>;
  onFocusChange: DirectEventHandler<OnFocusChangeEventData>;
  cardStyle: Styles;
  placeholders?: Placeholders;
}

type CardFieldViewType = HostComponent<NativeProps>;

export interface NativeCommands {
  focus: (viewRef: React.ElementRef<CardFieldViewType>) => void;
  blur: (viewRef: React.ElementRef<CardFieldViewType>) => void;
  clear: (viewRef: React.ElementRef<CardFieldViewType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['focus', 'blur', 'clear'],
});

export default codegenNativeComponent<NativeProps>(
  'CardField'
) as HostComponent<NativeProps>;
