import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

export interface NativeProps extends ViewProps {
  // Make sure to use a different default value here to make
  // sure onAfterUpdateTransaction gets called on Android.
  type?: CodegenTypes.WithDefault<CodegenTypes.Int32, -1>;
  appearance: CodegenTypes.Int32;
  borderRadius?: CodegenTypes.Int32;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'GooglePayButton'
) as ComponentType;
