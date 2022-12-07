import React from 'react';
import {
  AccessibilityProps,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
} from 'react-native';
import {
  ButtonType,
  ButtonStyle,
  ShippingMethod,
  ShippingContact,
} from '../types/PlatformPay';
import GooglePayButtonNative from './GooglePayButtonNative';
import ApplePayButtonNative from './ApplePayButtonNative';

/**
 *  PlatformPayButton Component Props
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
  /**
   * This callback is triggered whenever the user selects a shipping method in the Apple Pay sheet.
   * It receives one parameter: an `event` object with a `shippingMethod` field. You MUST
   * update the Apple Pay sheet in your callback using the updatePlatformPaySheet function, otherwise the
   * Apple Pay sheet will hang and the payment flow will automatically cancel.
   */
  onShippingMethodSelected?: (event: {
    shippingMethod: ShippingMethod;
  }) => void;
  /**
   * This callback is triggered whenever the user selects a shipping contact in the Apple Pay sheet.
   * It receives one parameter: an `event` object with a `shippingContact` field. You MUST
   * update the Apple Pay sheet in your callback using the updatePlatformPaySheet function, otherwise the
   * Apple Pay sheet will hang and the payment flow will automatically cancel.
   */
  onShippingContactSelected?: (event: {
    shippingContact: ShippingContact;
  }) => void;
  /**
   * This callback is triggered whenever the user inputs a coupon code in the Apple Pay sheet.
   * It receives one parameter: an `event` object with a `couponCode` field. You MUST
   * update the Apple Pay sheet in your callback using the updatePlatformPaySheet function, otherwise the
   * Apple Pay sheet will hang and the payment flow will automatically cancel.
   */
  onCouponCodeEntered?: (event: { couponCode: string }) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 *  PlatformPayButton Component. Display the platform-specific native wallet pay button: Apple Pay on iOS, and Google Pay on Android.
 *
 * @example
 * ```ts
 *  <PlatformPayButton
 *    onPress={pay}
 *    type={PlatformPay.ButtonType.Subscribe}
 *    appearance={PlatformPay.ButtonStyle.WhiteOutline}
 *    borderRadius={4}
 *    disabled={!isApplePaySupported}
 *    style={styles.payButton}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function PlatformPayButton({
  type = ButtonType.Default,
  appearance = ButtonStyle.Automatic,
  onPress,
  disabled,
  borderRadius,
  onShippingMethodSelected,
  onShippingContactSelected,
  onCouponCodeEntered,
  ...props
}: Props) {
  const shippingMethodCallback = onShippingMethodSelected
    ? (
        value: NativeSyntheticEvent<{
          shippingMethod: ShippingMethod;
        }>
      ) => {
        onShippingMethodSelected && onShippingMethodSelected(value.nativeEvent);
      }
    : undefined;

  const shippingContactCallback = onShippingContactSelected
    ? (
        value: NativeSyntheticEvent<{
          shippingContact: ShippingContact;
        }>
      ) => {
        onShippingContactSelected(value.nativeEvent);
      }
    : undefined;

  const couponCodeCallback = onCouponCodeEntered
    ? (
        value: NativeSyntheticEvent<{
          couponCode: string;
        }>
      ) => {
        onCouponCodeEntered && onCouponCodeEntered(value.nativeEvent);
      }
    : undefined;

  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={disabled ? 0.3 : 1}
      onPress={onPress}
      style={disabled ? styles.disabled : styles.notDisabled}
    >
      {Platform.OS === 'ios' ? (
        <ApplePayButtonNative
          type={type}
          buttonStyle={appearance}
          borderRadius={borderRadius}
          disabled={disabled}
          onShippingMethodSelectedAction={shippingMethodCallback}
          onShippingContactSelectedAction={shippingContactCallback}
          onCouponCodeEnteredAction={couponCodeCallback}
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
