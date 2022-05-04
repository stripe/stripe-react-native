import React from 'react';
import {
  AccessibilityProps,
  StyleProp,
  ViewStyle,
  requireNativeComponent,
  NativeSyntheticEvent,
  ImageSourcePropType,
} from 'react-native';
import type {
  Token,
  CardActionError,
  StripeError,
  GooglePayCardToken,
} from '../types';

const AddToWalletButtonNative =
  requireNativeComponent<any>('AddToWalletButton');

/**
 *  Add to wallet button component props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  /** Sets the Apple Wallet/Google Pay button style. If the button is placed over a dark background, set this to 'onDarkBackground', otherwise set to 'onLightBackground'. */
  iOSButtonStyle?: 'onDarkBackground' | 'onLightBackground';
  /** The image asset to use as the Google Pay button. Downloadable from https://developers.google.com/pay/issuers/apis/push-provisioning/android/downloads/flutter/googlepay_flutter_buttons.zip */
  androidAssetSource: ImageSourcePropType;
  testID?: string;
  /** Only set to `false` when shipping through TestFlight || App Store */
  testEnv?: boolean;
  /** Details of the Issued Card you'd like added to the device's wallet */
  cardDetails: {
    /** The `primary_account_identifier` value from the issued card. */
    primaryAccountIdentifier: string | null;
    /** The card holder name (used only on iOS) */
    name: string;
    /** A user-facing description of the card. Required on Android.*/
    description: string;
    /** Last 4 digits of the card, only used on iOS */
    lastFour?: string;
    /** Optional, only used on iOS */
    brand?: Token.CardBrand;
  };
  // Optional, only for Android and only for cards that are in the "yellow path" (as defined by Google- https://developers.google.com/pay/issuers/apis/push-provisioning/android/wallet-operations#resolving_yellow_path). Obtain this value via the `isCardInWallet` method.
  token?: GooglePayCardToken | null;
  /** Used by stripe to securely obtain card info of the card being provisioned. */
  ephemeralKey: object;
  /** Called when the flow completes. If the `error` field is `null`, then the card was successfully added to the user's native wallet. */
  onComplete(result: { error: StripeError<CardActionError> | null }): void;
}

/**
 *  Add to wallet button
 *
 * @example
 * ```ts
 *  <AddToWalletButton
 *    testEnv={true}
 *    style={styles.myButtonStyle}
 *    iOSButtonStyle="onLightBackground"
 *    cardDetails={{
 *      primaryAccountIdentifier: "V-123",
 *      name: "David Wallace",
 *      lastFour: "4242",
 *    }}
 *    ephemeralKey={myEphemeralKey} // This object is retrieved from your server. See https://stripe.com/docs/issuing/cards/digital-wallets?platform=react-native#update-your-backend
 *    onComplete={(error) => {
 *      Alert.alert(
 *        error ? error.code : 'Success',
 *        error
 *          ? error.message
 *          : 'Card was successfully added to the wallet.'
 *      );
 *    }}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function AddToWalletButton({ onComplete, ...props }: Props) {
  return (
    <AddToWalletButtonNative
      {...props}
      onCompleteAction={(
        value: NativeSyntheticEvent<{
          error: StripeError<CardActionError> | null;
        }>
      ) => onComplete(value.nativeEvent)}
    />
  );
}
