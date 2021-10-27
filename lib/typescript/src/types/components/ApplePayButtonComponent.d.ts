import type { StyleProp, ViewStyle } from 'react-native';
export declare namespace ApplePayButtonComponent {
    interface NativeProps {
        style?: StyleProp<ViewStyle>;
        type?: number;
        buttonStyle?: number;
        borderRadius?: number;
        onPressAction(): void;
    }
    type Types = 'plain' | 'buy' | 'setUp' | 'inStore' | 'donate' | 'checkout' | 'book' | 'subscribe' | 'reload' | 'addMoney' | 'topUp' | 'order' | 'rent' | 'support' | 'contribute' | 'tip';
    type Styles = 'white' | 'whiteOutline' | 'black' | 'automatic';
}
