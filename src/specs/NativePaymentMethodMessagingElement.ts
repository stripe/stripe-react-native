import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementConfiguration,
  PaymentMethodMessagingElementResult,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { UnsafeMixed } from './utils';

interface LoadCompleteEvent {
  result: UnsafeMixed<PaymentMethodMessagingElementResult>;
}

export interface NativeProps extends ViewProps {
  appearance?: UnsafeMixed<PaymentMethodMessagingElementAppearance>;
  configuration: UnsafeMixed<PaymentMethodMessagingElementConfiguration>;
  onLoadComplete: DirectEventHandler<LoadCompleteEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'PaymentMethodMessagingElement'
) as ComponentType;
