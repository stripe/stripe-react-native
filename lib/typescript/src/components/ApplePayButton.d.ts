import type { ApplePayButtonComponent } from '../types';
import { AccessibilityProps, StyleProp, ViewStyle } from 'react-native';
/**
 *  Apple Pay Button Component Props
 */
export interface Props extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    type?: ApplePayButtonComponent.Types;
    buttonStyle?: ApplePayButtonComponent.Styles;
    borderRadius?: number;
    onPress(): void;
    testID?: string;
}
/**
 *  Apple Pay Button Component
 *
 * @example
 * ```ts
 *  <ApplePayButton
 *    onPress={pay}
 *    type="plain"
 *    buttonStyle="black"
 *    borderRadius={4}
 *    style={styles.payButton}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export declare function ApplePayButton({ onPress, buttonStyle, type, borderRadius, ...props }: Props): JSX.Element;
