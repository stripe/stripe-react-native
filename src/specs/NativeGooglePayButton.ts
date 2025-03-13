import type { HostComponent, ViewProps } from 'react-native';
import type {
  WithDefault,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  // Make sure to use a different default value here to make
  // sure onAfterUpdateTransaction gets called on Android.
  type?: WithDefault<Int32, -1>;
  appearance: Int32;
  borderRadius?: Int32;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'GooglePayButton'
) as ComponentType;
