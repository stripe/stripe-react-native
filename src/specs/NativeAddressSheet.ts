import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  AddressDetails,
  AddressSheetError,
  PaymentSheet,
  StripeError,
} from '../types';
import type { UnsafeMixed } from './utils';

type CollectAddressResult = Required<AddressDetails>;

type AddressSheetErrorEvent = Readonly<{
  error: UnsafeMixed<StripeError<AddressSheetError>>;
}>;

type PresentationStyle =
  | 'fullscreen'
  | 'popover'
  | 'pageSheet'
  | 'formSheet'
  | 'automatic'
  | 'overFullScreen';

type AnimationStyle = 'flip' | 'curl' | 'slide' | 'dissolve';

type AdditionalFields = Readonly<{
  phoneNumber?: WithDefault<'hidden' | 'optional' | 'required', 'required'>;
  checkboxLabel?: string;
}>;

type OnSubmitActionEvent = Readonly<{
  result: UnsafeMixed<CollectAddressResult>;
}>;

export interface NativeProps extends ViewProps {
  visible: boolean;
  presentationStyle?: WithDefault<PresentationStyle, 'popover'>;
  animationStyle?: WithDefault<AnimationStyle, 'slide'>;
  appearance?: UnsafeMixed<PaymentSheet.AppearanceParams>;
  defaultValues?: UnsafeMixed<AddressDetails>;
  additionalFields?: AdditionalFields;
  allowedCountries?: Array<string>;
  autocompleteCountries?: Array<string>;
  primaryButtonTitle?: string;
  sheetTitle?: string;
  googlePlacesApiKey?: string;
  onSubmitAction: DirectEventHandler<OnSubmitActionEvent>;
  onErrorAction: DirectEventHandler<AddressSheetErrorEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AddressSheetView'
) as ComponentType;
