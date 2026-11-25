import type { ColorValue, HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type AttachEvent = Readonly<{
  attached: boolean;
}>;

export type OpenUrlEvent = Readonly<{
  url: string;
}>;

export interface NativeProps extends ViewProps {
  connectJsOrigin: string;
  scriptsRevision?: Int32;
  sheetBackgroundColor?: ColorValue;
  onAttach?: DirectEventHandler<AttachEvent>;
  onOpenUrl?: DirectEventHandler<OpenUrlEvent>;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  sheetChanged: (
    viewRef: React.ElementRef<ComponentType>,
    sheetId: string,
    height: Double,
    dismissible: boolean
  ) => void;
  resetSheets: (viewRef: React.ElementRef<ComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['sheetChanged', 'resetSheets'],
});

export default codegenNativeComponent<NativeProps>(
  'StripeConnectInlineHost'
) as ComponentType;
