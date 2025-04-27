import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import { EmbeddedPaymentElementConfiguration } from '../types/EmbeddedPaymentElement';
import { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeMixed } from './utils';

type OnEmbeddedPaymentElementDidUpdateHeightEvent = Readonly<{
  height: Double;
}>;

export interface NativeProps extends ViewProps {
  configuration: UnsafeMixed<EmbeddedPaymentElementConfiguration>;
  intentConfiguration: UnsafeMixed<IntentConfiguration>;
  onEmbeddedPaymentElementDidUpdateHeight?: DirectEventHandler<OnEmbeddedPaymentElementDidUpdateHeightEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'EmbeddedPaymentElementView'
) as ComponentType;
