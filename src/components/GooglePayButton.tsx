import React from 'react';
import {
  AccessibilityProps,
  StyleProp,
  ViewStyle,
  requireNativeComponent,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const GooglePayButtonNative = requireNativeComponent<any>('GooglePayButton');

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
export function GooglePayButton({
  type = 'pay',
  onPress,
  disabled,
  ...props
}: Props) {
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={1}
      onPress={onPress}
      style={disabled ? styles.disabled : {}}
    >
      <GooglePayButtonNative buttonType={type} {...props} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.3,
  },
});
