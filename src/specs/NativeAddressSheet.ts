import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { AddressSheetError, PaymentSheet, StripeError } from '../types';
import type { UnsafeMixed } from './utils';

type AddressDetails = Readonly<{
  name?: string;
  address?: Readonly<{
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  }>;
  phone?: string;
  isCheckboxSelected?: boolean;
}>;

type CollectedAddressDetailsEvent = Readonly<{
  name: string;
  address: Readonly<{
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  }>;
  phone: string;
  isCheckboxSelected: boolean;
}>;

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

export interface NativeProps extends ViewProps {
  visible: boolean;
  presentationStyle?: WithDefault<PresentationStyle, 'popover'>;
  animationStyle?: WithDefault<AnimationStyle, 'slide'>;
  appearance?: UnsafeMixed<PaymentSheet.AppearanceParams>;
  defaultValues?: AddressDetails;
  additionalFields?: {
    phoneNumber?: WithDefault<'hidden' | 'optional' | 'required', 'required'>;
    checkboxLabel?: string;
  };
  allowedCountries?: Array<string>;
  autocompleteCountries?: Array<string>;
  primaryButtonTitle?: string;
  sheetTitle?: string;
  googlePlacesApiKey?: string;
  onSubmitAction: DirectEventHandler<CollectedAddressDetailsEvent>;
  onErrorAction: DirectEventHandler<AddressSheetErrorEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AddressSheetView'
) as ComponentType;
