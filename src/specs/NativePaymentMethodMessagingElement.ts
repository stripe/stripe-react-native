import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementConfiguration,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { UnsafeMixed } from './utils';

export interface NativeProps extends ViewProps {
  appearance?: UnsafeMixed<PaymentMethodMessagingElementAppearance>;
  configuration: UnsafeMixed<PaymentMethodMessagingElementConfiguration>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'PaymentMethodMessagingElementView'
) as ComponentType;
