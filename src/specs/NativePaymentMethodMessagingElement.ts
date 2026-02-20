import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementConfiguration,
  PaymentMethodMessagingElementState,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { UnsafeMixed } from './utils';

interface StateChangeEvent {
  result: UnsafeMixed<PaymentMethodMessagingElementState>;
}

export interface NativeProps extends ViewProps {
  appearance?: UnsafeMixed<PaymentMethodMessagingElementAppearance>;
  configuration: UnsafeMixed<PaymentMethodMessagingElementConfiguration>;
  onStateChange: DirectEventHandler<StateChangeEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'PaymentMethodMessagingElementView'
) as ComponentType;
