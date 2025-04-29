import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import { EmbeddedPaymentElementConfiguration } from '../types/EmbeddedPaymentElement';
import { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeMixed } from './utils';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

type OnEmbeddedPaymentElementDidUpdateHeightEvent = Readonly<{
  height: Double;
}>;

export interface NativeProps extends ViewProps {
  configuration: UnsafeMixed<EmbeddedPaymentElementConfiguration>;
  intentConfiguration: UnsafeMixed<IntentConfiguration>;
  onEmbeddedPaymentElementDidUpdateHeight?: DirectEventHandler<OnEmbeddedPaymentElementDidUpdateHeightEvent>;
}

export interface NativeCommands {
  confirm: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  clearPaymentOption: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['confirm', 'clearPaymentOption'],
});

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'EmbeddedPaymentElementView'
) as ComponentType;
