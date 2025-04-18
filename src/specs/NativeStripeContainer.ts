import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  keyboardShouldPersistTaps: boolean;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'StripeContainer'
) as ComponentType;
