import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type OnExitActionEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  visible: boolean;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
  onExitAction: DirectEventHandler<OnExitActionEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ConnectAccountOnboardingView'
) as ComponentType;
