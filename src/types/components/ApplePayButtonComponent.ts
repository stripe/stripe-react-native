import type { StyleProp, ViewStyle } from 'react-native';

export namespace ApplePayButtonComponent {
  export interface NativeProps {
    style?: StyleProp<ViewStyle>;
    type?: number;
    buttonStyle?: number;
    borderRadius?: number;
    onPressAction(): void;
  }

  export type Types =
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

  export type Styles = 'white' | 'whiteOutline' | 'black' | 'automatic';
}
