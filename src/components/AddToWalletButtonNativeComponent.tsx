// diff from docs:
// @ts-ignore
import type { ViewProps } from 'react-native/Libraries/Components/View/ViewPropTypes';
import type {
  HostComponent,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  Token,
  CardActionError,
  StripeError,
  GooglePayCardToken,
} from '../types';

export interface NativeProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  /** Sets the Apple Wallet/Google Pay button style. If the button is placed over a dark background, set this to 'onDarkBackground', otherwise set to 'onLightBackground'. */
  iOSButtonStyle?: 'onDarkBackground' | 'onLightBackground';
  /** The image asset to use as the Google Pay button. Downloadable from https://developers.google.com/pay/issuers/apis/push-provisioning/android/downloads/flutter/googlepay_flutter_buttons.zip */
  androidAssetSource: ImageSourcePropType;
  testID?: string;
  /** iOS only. Set this to `true` until shipping through TestFlight || App Store. If true, you must be using live cards, and have the proper iOS entitlement set up. See https://stripe.com/docs/issuing/cards/digital-wallets?platform=react-native#requesting-access-for-ios */
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

export default codegenNativeComponent<NativeProps>(
  'AddToWalletButtonView'
) as HostComponent<NativeProps>;
