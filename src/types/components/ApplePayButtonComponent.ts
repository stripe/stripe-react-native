import type { StyleProp, ViewStyle } from 'react-native';

export interface NativeProps {
  style?: StyleProp<ViewStyle>;
  type?: number;
  buttonStyle?: number;
  borderRadius?: number;
  onPressAction(): void;
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
  | 'tip';

export type Style = 'white' | 'whiteOutline' | 'black' | 'automatic';
