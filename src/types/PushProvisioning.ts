import type { StripeError, GooglePayError } from './Errors';

export type GooglePayCardToken = {
  /** The token reference ID. */
  id: string;
  /** Last four digits of the FPAN */
  fpanLastFour: string;
  /** Last four digits of the DPAN */
  dpanLastFour: string;
  network: number;
  serviceProvider: number;
  /** The name of the issuer. */
  issuer: string;
  /** The GooglePayCardTokenStatus. */
  status: GooglePayCardTokenStatus;
  /** Deprecated. Use fpanLastFour or dpanLastFour. */
  cardLastFour: string;
};

export enum GooglePayCardTokenStatus {
  /**  */
  TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION = 'TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION',
  /**  */
  TOKEN_STATE_PENDING = 'TOKEN_STATE_PENDING',
  /**  */
  TOKEN_STATE_SUSPENDED = 'TOKEN_STATE_SUSPENDED',
  /**  */
  TOKEN_STATE_ACTIVE = 'TOKEN_STATE_ACTIVE',
  /**  */
  TOKEN_STATE_FELICA_PENDING_PROVISIONING = 'TOKEN_STATE_FELICA_PENDING_PROVISIONING',
  /**  */
  TOKEN_STATE_UNTOKENIZED = 'TOKEN_STATE_UNTOKENIZED',
}

export type IsCardInWalletResult =
  | {
      isInWallet: boolean;
      token?: GooglePayCardToken;
      error?: undefined;
    }
  | {
      isInWallet?: undefined;
      token?: undefined;
      error: StripeError<GooglePayError>;
    };

export type CanAddCardToWalletParams = {
  /** The `primary_account_identifier` value from the issued card. Can be an empty string. */
  primaryAccountIdentifier: string | null;
  /** Last 4 digits of the card number. Required for Android. */
  cardLastFour: string;
  /** iOS only. Set this to `true` until shipping through TestFlight || App Store. If false, you must be using live cards, and have the proper iOS entitlement set up. See https://stripe.com/docs/issuing/cards/digital-wallets?platform=react-native#requesting-access-for-ios */
  testEnv?: boolean;
  /** iOS only. Set this to `true` if: your user has an Apple Watch device currently paired, and you want to check that device for the presence of the specified card. */
  hasPairedAppleWatch?: boolean;
  /** Android only, defaults to `true`. Set this to `false` if you'd like to allow users without NFC-enabled devices to add cards to the wallet. NFC is required for paying in stores. */
  supportsTapToPay?: boolean;
};

export type CanAddCardToWalletResult =
  | {
      canAddCard: boolean;
      details?: {
        token?: GooglePayCardToken;
        status?: CanAddCardToWalletStatus;
      };
      error?: undefined;
    }
  | {
      canAddCard?: undefined;
      details?: undefined;
      error: StripeError<GooglePayError>;
    };

export enum CanAddCardToWalletStatus {
  /** You are missing configuration required for Push Provisioning. Make sure you've completed all steps at https://stripe.com/docs/issuing/cards/digital-wallets?platform=react-native. */
  MISSING_CONFIGURATION = 'MISSING_CONFIGURATION',
  /** This device doesn't support adding a card to the native wallet. */
  UNSUPPORTED_DEVICE = 'UNSUPPORTED_DEVICE',
  /** This card already exists on this device and any paired devices. */
  CARD_ALREADY_EXISTS = 'CARD_ALREADY_EXISTS',
  /** This card already exists on this device, but not on the paired device. */
  CARD_EXISTS_ON_CURRENT_DEVICE = 'CARD_EXISTS_ON_CURRENT_DEVICE',
  /** This card already exists on the paired device, but not on this device. */
  CARD_EXISTS_ON_PAIRED_DEVICE = 'CARD_EXISTS_ON_PAIRED_DEVICE',
}
