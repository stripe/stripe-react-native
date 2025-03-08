import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  DirectEventHandler,
  Int32,
  UnsafeMixed,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import type { ViewProps, HostComponent } from 'react-native';

interface AddressDetails {
  name?: string;
  address?: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  };
  phone?: string;
  isCheckboxSelected?: boolean;
}

interface CollectedAddressDetailsEvent {
  name: string;
  address: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  };
  phone: string;
  isCheckboxSelected: boolean;
}

interface AddressSheetErrorEvent {
  error: {
    code: 'Failed' | 'Canceled';
    message: string;
    localizedMessage?: string;
    declineCode?: string;
    stripeErrorCode?: string;
    type?:
      | 'api_connection_error'
      | 'api_error'
      | 'authentication_error'
      | 'card_error'
      | 'idempotency_error'
      | 'invalid_request_error'
      | 'rate_limit_error';
  };
}

interface AddressSheetAppearance {
  font?: {};
  colors?: UnsafeMixed;
  shapes?: {
    borderRadius?: Int32;
    borderWidth?: Int32;
    shadow?: {};
  };
  primaryButton?: {};
}

export interface NativeProps extends ViewProps {
  visible: boolean;
  presentationStyle?: WithDefault<
    | 'fullscreen'
    | 'popover'
    | 'pageSheet'
    | 'formSheet'
    | 'automatic'
    | 'overFullScreen',
    'popover'
  >;
  animationStyle?: WithDefault<'flip' | 'curl' | 'slide' | 'dissolve', 'slide'>;
  appearance?: AddressSheetAppearance;
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
