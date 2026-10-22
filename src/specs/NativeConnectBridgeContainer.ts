import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type ConnectBridgeRequestEvent = Readonly<{
  attachmentId: string;
  requestHandle: string;
  documentId: string;
  contextId: string;
  sourceGeneration: string;
  rawMessage: string;
}>;

export type ConnectBridgeClaimResultEvent = Readonly<{
  claimId: string;
  attachmentId: string;
  requestHandle: string;
  sourceGeneration: string;
  admitted: boolean;
  claimToken?: string;
}>;

export type ConnectBridgeErrorEvent = Readonly<{
  error: string;
}>;

export interface NativeProps extends ViewProps {
  contextId?: string;
  sourceGeneration?: string;
  connectSource?: string;
  initializationObjectJson?: string;
  observeContentHeight?: boolean;
  onBridgeRequest?: DirectEventHandler<ConnectBridgeRequestEvent>;
  onBridgeClaimResult?: DirectEventHandler<ConnectBridgeClaimResultEvent>;
  onBridgeError?: DirectEventHandler<ConnectBridgeErrorEvent>;
}

export interface NativeCommands {
  reply: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    attachmentId: string,
    requestHandle: string,
    payload: string
  ) => void;
  claim: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    claimId: string,
    attachmentId: string,
    requestHandle: string,
    documentId: string,
    contextId: string,
    sourceGeneration: string
  ) => void;
  cancel: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    attachmentId: string,
    requestHandle: string
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['reply', 'claim', 'cancel'],
});

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ConnectBridgeContainer'
) as ComponentType;
