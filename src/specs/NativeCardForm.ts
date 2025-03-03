import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { CardFormView } from '../types';
import type { UnsafeMixed } from './utils';

interface FormCompleteEvent {
  card: UnsafeMixed<CardFormView.Details>;
}

export interface FocusChangeEvent {
  focusedField: 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode' | null;
}

export interface NativeProps extends ViewProps {
  autofocus: boolean;
  cardStyle: UnsafeMixed<CardFormView.Styles>;
  dangerouslyGetFullCardDetails: boolean;
  defaultValues: UnsafeMixed<CardFormView.DefaultValues>;
  disabled: boolean;
  onFocusChange?: DirectEventHandler<FocusChangeEvent>;
  onFormComplete?: DirectEventHandler<FormCompleteEvent>;
  placeholders: UnsafeMixed<CardFormView.Placeholders>;
  postalCodeEnabled: boolean;
  preferredNetworks?: Int32[];
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  blur: (viewRef: React.ElementRef<ComponentType>) => void;
  focus: (viewRef: React.ElementRef<ComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['blur', 'focus'],
});

export default codegenNativeComponent<NativeProps>('CardForm') as ComponentType;
