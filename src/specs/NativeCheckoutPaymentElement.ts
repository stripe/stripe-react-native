import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  controllerId: string;
  onHeightChanged?: DirectEventHandler<Readonly<{ height: Double }>>;
}

export default codegenNativeComponent<NativeProps>(
  'CheckoutPaymentElementView'
) as HostComponent<NativeProps>;
