import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
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
  type: CodegenTypes.Int32;
  buttonStyle: CodegenTypes.Int32;
  buttonBorderRadius?: CodegenTypes.WithDefault<CodegenTypes.Int32, 4>;
  onShippingMethodSelectedAction?: CodegenTypes.DirectEventHandler<OnShippingMethodSelectedActionEvent>;
  onShippingContactSelectedAction?: CodegenTypes.DirectEventHandler<OnShippingContactSelectedActionEvent>;
  onCouponCodeEnteredAction?: CodegenTypes.DirectEventHandler<OnCouponCodeEnteredActionEvent>;
  onOrderTrackingAction?: CodegenTypes.DirectEventHandler<OnOrderTrackingActionEvent>;
  // Boolean flags to indicate which callbacks are provided
  hasShippingMethodCallback?: CodegenTypes.WithDefault<boolean, false>;
  hasShippingContactCallback?: CodegenTypes.WithDefault<boolean, false>;
  hasCouponCodeCallback?: CodegenTypes.WithDefault<boolean, false>;
  hasOrderTrackingCallback?: CodegenTypes.WithDefault<boolean, false>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'ApplePayButton'
) as ComponentType;
