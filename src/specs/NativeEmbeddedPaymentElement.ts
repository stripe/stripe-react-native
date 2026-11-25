import {
  codegenNativeCommands,
  codegenNativeComponent,
  type HostComponent,
  type ViewProps,
} from 'react-native';
import { EmbeddedPaymentElementConfiguration } from '../types/EmbeddedPaymentElement';
import { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeMixed } from './utils';

export interface NativeProps extends ViewProps {
  configuration: UnsafeMixed<EmbeddedPaymentElementConfiguration>;
  intentConfiguration?: UnsafeMixed<IntentConfiguration>;
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
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['confirm', 'clearPaymentOption', 'update'],
});

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'EmbeddedPaymentElementView'
) as ComponentType;
