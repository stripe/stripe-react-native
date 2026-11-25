import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

export interface NativeProps extends ViewProps {
  controllerId: string;
  onHeightChanged?: CodegenTypes.DirectEventHandler<
    Readonly<{ height: CodegenTypes.Double }>
  >;
}

export default codegenNativeComponent<NativeProps>(
  'CheckoutPaymentElementView'
) as HostComponent<NativeProps>;
