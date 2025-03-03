import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type { ViewProps, HostComponent } from 'react-native';

interface CardChangeEvent {
  last4: string;
  expiryMonth: Int32;
  expiryYear: Int32;
  postalCode?: string;
  brand:
    | 'AmericanExpress'
    | 'DinersClub'
    | 'Discover'
    | 'JCB'
    | 'MasterCard'
    | 'UnionPay'
    | 'Visa'
    | 'Unknown';
  complete: boolean;
  // Sadly codegen doesn't support type aliases here.
  validExpiryDate: 'Valid' | 'Invalid' | 'Incomplete' | 'Unknown';
  validCVC: 'Valid' | 'Invalid' | 'Incomplete' | 'Unknown';
  validNumber: 'Valid' | 'Invalid' | 'Incomplete' | 'Unknown';
  number?: string;
  cvc?: string;
}

export interface FocusChangeEvent {
  focusedField: 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode' | null;
}

interface CardFieldStyle {
  borderWidth?: Int32;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: Int32;
  textColor?: string;
  fontSize?: Int32;
  placeholderColor?: string;
  cursorColor?: string;
  textErrorColor?: string;
  fontFamily?: string;
}

interface CardFieldPlaceholders {
  number?: string;
  expiration?: string;
  cvc?: string;
  postalCode?: string;
}

export interface NativeProps extends ViewProps {
  autofocus: boolean;
  cardStyle: CardFieldStyle;
  countryCode?: string;
  dangerouslyGetFullCardDetails: boolean;
  disabled: boolean;
  onBehalfOf?: string;
  onCardChange?: DirectEventHandler<CardChangeEvent>;
  onFocusChange?: DirectEventHandler<FocusChangeEvent>;
  placeholders: CardFieldPlaceholders;
  postalCodeEnabled: boolean;
  preferredNetworks?: Int32[];
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  blur: (viewRef: React.ElementRef<ComponentType>) => void;
  focus: (viewRef: React.ElementRef<ComponentType>) => void;
  clear: (viewRef: React.ElementRef<ComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['blur', 'focus', 'clear'],
});

export default codegenNativeComponent<NativeProps>(
  'CardField'
) as ComponentType;
