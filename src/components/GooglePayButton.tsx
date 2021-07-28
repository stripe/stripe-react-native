import React from 'react';
import {
  AccessibilityProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
  requireNativeComponent,
} from 'react-native';

const GooglePayButtonNative = requireNativeComponent<any>('GooglePayButton');

/**
 *  Apple Pay Button Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  type?:
    | 'pay'
    | 'pay_shadow'
    | 'pay_dark'
    | 'standard'
    | 'standard_shadow'
    | 'standard_dark';
  onPress(): void;
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
export function GooglePayButton({ type = 'pay', ...props }: Props) {
  return <GooglePayButtonNative buttonType={type} {...props} />;
}

const styles = StyleSheet.create({
  outerContainer: {
    padding: 8,
  },
  container: {
    elevation: 4,
    minWidth: 152,
    height: 80,
    borderRadius: 12,
  },
});
