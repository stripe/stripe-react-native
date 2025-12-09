import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type CloseButtonPressEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  title?: string;
  onCloseButtonPress?: DirectEventHandler<CloseButtonPressEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'NavigationBar'
) as ComponentType;
