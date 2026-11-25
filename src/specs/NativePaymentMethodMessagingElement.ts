import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
import {
  PaymentMethodMessagingElementAppearance,
  PaymentMethodMessagingElementConfiguration,
} from '../types/components/PaymentMethodMessagingElementComponent';
import { UnsafeMixed } from './utils';

type ConfigureResultPayload = Readonly<{
  status?: string;
  message?: string;
  code?: string;
  viewTag?: CodegenTypes.Int32;
}>;

export interface NativeProps extends ViewProps {
  appearance?: UnsafeMixed<PaymentMethodMessagingElementAppearance>;
  configuration: UnsafeMixed<PaymentMethodMessagingElementConfiguration>;
  onConfigureResult?: CodegenTypes.DirectEventHandler<
    Readonly<{
      result: UnsafeMixed<ConfigureResultPayload>;
    }>
  >;
  onHeightChanged?: CodegenTypes.DirectEventHandler<
    Readonly<{ height: CodegenTypes.Double; viewTag: CodegenTypes.Int32 }>
  >;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'PaymentMethodMessagingElementView'
) as ComponentType;
