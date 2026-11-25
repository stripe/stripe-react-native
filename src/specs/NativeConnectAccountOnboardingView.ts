import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

type OnExitActionEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  visible: boolean;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
  onExitAction: CodegenTypes.DirectEventHandler<OnExitActionEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ConnectAccountOnboardingView'
) as ComponentType;
