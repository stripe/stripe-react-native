import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  CardActionError,
  GooglePayCardToken,
  StripeError,
} from '../types';
import type { UnsafeMixed, ImageSource } from './utils';

type AddToWalletButtonCompleteEvent = Readonly<{
  error: UnsafeMixed<StripeError<CardActionError>> | null;
}>;

type CardDetails = Readonly<{
  primaryAccountIdentifier: string | null;
  name: string;
  description: string;
  lastFour?: string;
  brand?: string;
}>;

type ButtonType = 'onDarkBackground' | 'onLightBackground';

export interface NativeProps extends ViewProps {
  iOSButtonStyle?: WithDefault<ButtonType, 'onDarkBackground'>;
  androidAssetSource: ImageSource;
  testEnv?: boolean;
  cardDetails: CardDetails;
  token: UnsafeMixed<GooglePayCardToken>;
  ephemeralKey: UnsafeMixed<object>;
  onComplete?: DirectEventHandler<AddToWalletButtonCompleteEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AddToWalletButton'
) as ComponentType;
