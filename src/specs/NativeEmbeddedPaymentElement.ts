import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import { EmbeddedPaymentElementConfiguration } from '../types/EmbeddedPaymentElement';
import { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeMixed } from './utils';

export interface NativeProps extends ViewProps {
  configuration: UnsafeMixed<EmbeddedPaymentElementConfiguration>;
  intentConfiguration?: UnsafeMixed<IntentConfiguration>;
  checkout?: UnsafeMixed<{ sessionKey: string }>;
}

export interface NativeCommands {
  confirm: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  clearPaymentOption: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>
  ) => void;
  update: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    intentConfigurationJson: string
  ) => void;
  updateWithCheckout: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    sessionKey: string
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'confirm',
    'clearPaymentOption',
    'update',
    'updateWithCheckout',
  ],
});

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'EmbeddedPaymentElementView'
) as ComponentType;
