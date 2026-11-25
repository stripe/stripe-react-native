import {
  codegenNativeCommands,
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
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
  onFocusChange?: CodegenTypes.DirectEventHandler<FocusChangeEvent>;
  onFormComplete?: CodegenTypes.DirectEventHandler<FormCompleteEvent>;
  placeholders: UnsafeMixed<CardFormView.Placeholders>;
  postalCodeEnabled: boolean;
  preferredNetworks?: CodegenTypes.Int32[];
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
