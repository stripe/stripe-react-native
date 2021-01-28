import type { StyleProp, ViewStyle } from 'react-native';

declare module '@stripe/stripe-react-native' {
  namespace ApplePayButtonComponent {
    export interface Props {
      style?: StyleProp<ViewStyle>;
      type?: number;
      buttonStyle?: number;
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
}
