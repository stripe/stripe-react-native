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
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  ButtonType,
  ButtonStyle,
  ShippingMethod,
  ShippingContact,
} from '../types/PlatformPay';
import NativeApplePayButton from '../specs/NativeApplePayButton';
import NativeGooglePayButton from '../specs/NativeGooglePayButton';

/**
 *  PlatformPayButton Component Props
 */
export interface Props extends AccessibilityProps {
  /** Sets the text displayed by the button. */
  type?: ButtonType;
  /** Sets the coloring of the button. */
  appearance?: ButtonStyle;
  /** Sets the border radius of the button. */
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
   * This callback is triggered whenever the user selects a shipping contact in the Apple Pay sheet IF
   * ContactField.PostalAddress was included in the requiredShippingAddressFields array.
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
  /** Callback function for setting the order details (retrieved from your server) to give users the
   * ability to track and manage their purchases in Wallet. Stripe calls your implementation after the
   * payment is complete, but before iOS dismisses the Apple Pay sheet. You must call the `completion`
   * function, or else the Apple Pay sheet will hang.*/
  setOrderTracking?: (
    completion: (
      orderIdentifier: string,
      orderTypeIdentifier: string,
      authenticationToken: string,
      webServiceUrl: string
    ) => void
  ) => void;
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
  setOrderTracking,
  style,
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

  const orderTrackingCallback = setOrderTracking
    ? () => {
        setOrderTracking(NativeStripeSdk.configureOrderTracking);
      }
    : undefined;

  const callbackProps: any = {
    onShippingMethodSelectedAction: shippingMethodCallback,
    onShippingContactSelectedAction: shippingContactCallback,
    onCouponCodeEnteredAction: couponCodeCallback,
    onOrderTrackingAction: orderTrackingCallback,
    hasShippingMethodCallback: !!onShippingMethodSelected,
    hasShippingContactCallback: !!onShippingContactSelected,
    hasCouponCodeCallback: !!onCouponCodeEntered,
    hasOrderTrackingCallback: !!setOrderTracking,
  };

  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={disabled ? 0.3 : 1}
      onPress={onPress}
      style={[disabled ? styles.disabled : styles.notDisabled, style]}
    >
      {Platform.OS === 'ios' ? (
        <NativeApplePayButton
          type={type}
          buttonStyle={appearance}
          borderRadius={borderRadius}
          disabled={disabled ?? false}
          style={styles.nativeButtonStyle}
          {...callbackProps}
          {...props}
        />
      ) : (
        <NativeGooglePayButton
          type={type}
          appearance={appearance}
          borderRadius={borderRadius}
          style={styles.nativeButtonStyle}
          {...props}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    flex: 0,
    opacity: 0.4,
  },
  notDisabled: {
    flex: 0,
  },
  nativeButtonStyle: { flex: 1 },
});
