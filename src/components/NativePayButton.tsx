import React from 'react';
import {
  AccessibilityProps,
  StyleProp,
  ViewStyle,
  requireNativeComponent,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { ButtonType, ButtonStyle } from '../types/NativePay';

const GooglePayButtonNative = requireNativeComponent<any>('GooglePayButton');
const ApplePayButtonNative = requireNativeComponent<any>('ApplePayButton');

/**
 *  Native Pay Button Component Props
 */
export interface Props extends AccessibilityProps {
  /** Sets the text displayed by the button. */
  type?: ButtonType;
  /** iOS only. Sets the coloring of the button. */
  appearance?: ButtonStyle;
  /** iOS only. Sets the border radius of the button. */
  borderRadius?: number;
  /** Function called whenever the button is pressed. */
  onPress(): void;
  /** Set to `true` to disable the button from being pressed & apply a slight opacity to indicate that it is unpressable. Defaults to false. */
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 *  Native Pay Button Component. Display the platform-specific native wallet pay button: Apple Pay on iOS, and Google Pay on Android.
 *
 * @example
 * ```ts
 *  <NativePayButton
 *    onPress={pay}
 *    type={NativePay.ButtonType.Subscribe}
 *    appearance={NativePay.ButtonStyle.WhiteOutline}
 *    borderRadius={4}
 *    disabled={!isApplePaySupported}
 *    style={styles.payButton}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function NativePayButton({
  type = ButtonType.Plain,
  appearance = ButtonStyle.Automatic,
  onPress,
  disabled,
  borderRadius,
  ...props
}: Props) {
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={1}
      onPress={onPress}
      style={disabled ? styles.disabled : styles.notDisabled}
    >
      {Platform.OS === 'ios' ? (
        <ApplePayButtonNative
          type={type}
          buttonStyle={appearance}
          borderRadius={borderRadius}
          {...props}
        />
      ) : (
        <GooglePayButtonNative type={type} {...props} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    flex: 0,
    opacity: 0.3,
  },
  notDisabled: {
    flex: 0,
  },
});
