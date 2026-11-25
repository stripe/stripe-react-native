import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

export type CloseButtonPressEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  title?: string;
  onCloseButtonPress?: CodegenTypes.DirectEventHandler<CloseButtonPressEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'NavigationBar'
) as ComponentType;
