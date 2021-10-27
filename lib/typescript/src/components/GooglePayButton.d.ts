import { AccessibilityProps, StyleProp, ViewStyle } from 'react-native';
/**
 *  Apple Pay Button Component Props
 */
export interface Props extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    type?: 'pay' | 'pay_shadow' | 'standard' | 'standard_shadow';
    onPress(): void;
    disabled?: boolean;
    testID?: string;
}
/**
 *  Google Pay Button Component
 *
 * @example
 * ```ts
 *  <GooglePayButton
 *    onPress={pay}
 *    style={styles.payButton}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export declare function GooglePayButton({ type, onPress, disabled, ...props }: Props): JSX.Element;
