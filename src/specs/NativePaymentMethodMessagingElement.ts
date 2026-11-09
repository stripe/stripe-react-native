import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementConfiguration,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { UnsafeMixed } from './utils';

type ConfigureResultPayload = Readonly<{
  status?: string;
  message?: string;
  code?: string;
  viewTag?: Int32;
}>;

export interface NativeProps extends ViewProps {
  appearance?: UnsafeMixed<PaymentMethodMessagingElementAppearance>;
  configuration: UnsafeMixed<PaymentMethodMessagingElementConfiguration>;
  onConfigureResult?: DirectEventHandler<
    Readonly<{
      result: UnsafeMixed<ConfigureResultPayload>;
    }>
  >;
  onHeightChanged?: DirectEventHandler<
    Readonly<{ height: Double; viewTag: Int32 }>
  >;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'PaymentMethodMessagingElementView'
) as ComponentType;
