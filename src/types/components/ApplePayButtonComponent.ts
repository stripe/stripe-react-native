import type { StyleProp, ViewStyle, NativeSyntheticEvent } from 'react-native';
import type { ShippingMethod, ShippingContact } from '../PlatformPay';
export interface NativeProps {
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  type?: number;
  buttonStyle?: number;
  borderRadius?: number;
  onPressAction?(): void;
  onShippingMethodSelectedAction?: (
    value: NativeSyntheticEvent<{
      shippingMethod: ShippingMethod;
    }>
  ) => void;
  onShippingContactSelectedAction?: (
    value: NativeSyntheticEvent<{
      shippingContact: ShippingContact;
    }>
  ) => void;
  onCouponCodeEnteredAction?: (
    value: NativeSyntheticEvent<{
      couponCode: string;
    }>
  ) => void;
  onOrderTrackingAction?: () => void;
}

export type Type =
  | 'plain'
  | 'buy'
  | 'setUp'
  | 'inStore'
  | 'donate'
  | 'checkout'
  | 'book'
  | 'subscribe'
  | 'reload'
  | 'addMoney'
  | 'topUp'
  | 'order'
  | 'rent'
  | 'support'
  | 'contribute'
  | 'tip'
  | 'continue';

export type Style = 'white' | 'whiteOutline' | 'black' | 'automatic';
