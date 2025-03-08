import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type { ViewProps, HostComponent } from 'react-native';
import type { UnsafeMixed } from './utils';
import type { CardBrand } from '../types/Token';

interface FormCompleteEvent {
  last4: string;
  expiryMonth: Int32;
  expiryYear: Int32;
  postalCode?: string;
  brand: UnsafeMixed<CardBrand>;
  complete: boolean;
  country: string;
  number?: string;
  cvc?: string;
}

export interface FocusChangeEvent {
  focusedField: 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode' | null;
}

type CardFormStyle = Readonly<{
  backgroundColor?: string;
  borderWidth?: Int32;
  borderColor?: string;
  borderRadius?: Int32;
  textColor?: string;
  fontSize?: Int32;
  placeholderColor?: string;
  cursorColor?: string;
  textErrorColor?: string;
  fontFamily?: string;
}>;

type CardFormPlaceholders = Readonly<{
  number?: string;
  expiration?: string;
  cvc?: string;
  postalCode?: string;
}>;

type CardFormDefaultValues = Readonly<{
  countryCode?: string;
}>;

export interface NativeProps extends ViewProps {
  autofocus: boolean;
  cardStyle: CardFormStyle;
  dangerouslyGetFullCardDetails: boolean;
  defaultValues: CardFormDefaultValues;
  disabled: boolean;
  onFocusChange?: DirectEventHandler<FocusChangeEvent>;
  onFormComplete?: DirectEventHandler<FormCompleteEvent>;
  placeholders: CardFormPlaceholders;
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

export default codegenNativeComponent<NativeProps>('CardForm') as ComponentType;
