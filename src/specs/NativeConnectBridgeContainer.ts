import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type ConnectBridgeRequestEvent = Readonly<{
  attachmentId: string;
  requestHandle: string;
  documentId: string;
  contextId: string;
  rawMessage: string;
}>;

export type ConnectBridgeErrorEvent = Readonly<{
  error: string;
}>;

export interface NativeProps extends ViewProps {
  contextId?: string;
  connectSource?: string;
  initializationObjectJson?: string;
  observeContentHeight?: boolean;
  onBridgeRequest?: DirectEventHandler<ConnectBridgeRequestEvent>;
  onBridgeError?: DirectEventHandler<ConnectBridgeErrorEvent>;
}

export interface NativeCommands {
  reply: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    attachmentId: string,
    requestHandle: string,
    payload: string
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['reply'],
});

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ConnectBridgeContainer'
) as ComponentType;
