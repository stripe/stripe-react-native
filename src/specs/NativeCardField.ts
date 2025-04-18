import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  Details,
  Placeholders,
  Styles,
} from '../types/components/CardFieldInput';
import type { UnsafeMixed } from './utils';

type CardChangeEvent = Readonly<{
  card: UnsafeMixed<Details>;
}>;

export type FocusChangeEvent = Readonly<{
  focusedField: string;
}>;

export interface NativeProps extends ViewProps {
  autofocus: boolean;
  cardStyle: UnsafeMixed<Styles>;
  countryCode?: string;
  dangerouslyGetFullCardDetails: boolean;
  disabled: boolean;
  onBehalfOf?: string;
  onCardChange?: DirectEventHandler<CardChangeEvent>;
  onFocusChange?: DirectEventHandler<FocusChangeEvent>;
  placeholders: UnsafeMixed<Placeholders>;
  postalCodeEnabled: boolean;
  preferredNetworks?: ReadonlyArray<Int32>;
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
