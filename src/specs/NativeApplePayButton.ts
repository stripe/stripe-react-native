import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import { ShippingContact, ShippingMethod } from '../types/PlatformPay';
import { UnsafeMixed } from './utils';

type OnShippingMethodSelectedActionEvent = {
  shippingMethod: UnsafeMixed<ShippingMethod>;
};

type OnShippingContactSelectedActionEvent = {
  shippingContact: UnsafeMixed<ShippingContact>;
};

type OnCouponCodeEnteredActionEvent = {
  couponCode: string;
};

type OnOrderTrackingActionEvent = {};

export interface NativeProps extends ViewProps {
  disabled: boolean;
  type: Int32;
  buttonStyle: Int32;
  borderRadius?: WithDefault<Int32, 4>;
  onShippingMethodSelectedAction?: DirectEventHandler<OnShippingMethodSelectedActionEvent>;
  onShippingContactSelectedAction?: DirectEventHandler<OnShippingContactSelectedActionEvent>;
  onCouponCodeEnteredAction?: DirectEventHandler<OnCouponCodeEnteredActionEvent>;
  onOrderTrackingAction?: DirectEventHandler<OnOrderTrackingActionEvent>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ApplePayButton'
) as ComponentType;
