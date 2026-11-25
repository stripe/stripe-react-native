import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
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

export interface NativeProps extends ViewProps {
  iOSButtonStyle?: CodegenTypes.WithDefault<string, 'onDarkBackground'>;
  androidAssetSource: ImageSource;
  testEnv?: boolean;
  cardDetails: UnsafeMixed<CardDetails>;
  token?: UnsafeMixed<GooglePayCardToken> | null;
  isBounceProvisioned?: boolean;
  ephemeralKey: UnsafeMixed<object>;
  onCompleteAction?: CodegenTypes.DirectEventHandler<AddToWalletButtonCompleteEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AddToWalletButton'
) as ComponentType;
