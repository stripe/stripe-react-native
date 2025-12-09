import type { Address } from './Common';
import type { OnrampError, StripeError } from './Errors';

/**
 * Configuration used to initialize and customize the crypto onramp experience.
 *
 * - `merchantDisplayName` is shown in Stripe-provided UI (e.g., Link, Identity).
 * - `appearance` customizes colors and primary button styling for Stripe UI.
 */
export type Configuration = {
  /** Merchant name to display in Stripe-provided UI. */
  merchantDisplayName: string;
  /** Appearance overrides for Stripe-provided UI used during onramp. */
  appearance: LinkAppearance;
  /** The identifier of the Stripe crypto customer object. */
  cryptoCustomerId?: string;
};

/**
 * Customization options for Link/Stripe-provided UI.
 */
export type LinkAppearance = {
  /** Color overrides used when the device is in light mode. */
  lightColors?: LinkColors;
  /** Color overrides used when the device is in dark mode. */
  darkColors?: LinkColors;
  /** UI style preference for Stripe UI. */
  style?: LinkStyle;
  /** Primary button appearance overrides. */
  primaryButton?: LinkPrimaryButton;
};

/**
 * Color tokens used by Link/Stripe-provided UI.
 */
export type LinkColors = {
  /** Primary brand color. */
  primary: string;
  /** Foreground content color to render on top of the primary color. */
  contentOnPrimary: string;
  /** Color used for selected borders and outlines. */
  borderSelected: string;
};

/**
 * UI style preference for Stripe UI.
 * - `AUTOMATIC`: Follow the system appearance.
 * - `ALWAYS_LIGHT`: Always render a light appearance.
 * - `ALWAYS_DARK`: Always render a dark appearance.
 */
export type LinkStyle = 'AUTOMATIC' | 'ALWAYS_LIGHT' | 'ALWAYS_DARK';

/**
 * Primary button appearance overrides.
 */
export type LinkPrimaryButton = {
  /** Corner radius in dp/points. */
  cornerRadius?: number;
  /** Button height in dp/points. */
  height?: number;
};

/**
 * Information used to register a new Link user for crypto onramp.
 *
 * Notes:
 * - `phone` must be in E.164 format (e.g., +12125551234).
 * - `country` must be a two-letter ISO 3166-1 alpha-2 code.
 * - `fullName` should be collected for users outside the US; otherwise optional.
 */
export type LinkUserInfo = {
  /** The user's email address. */
  email: string;
  /** The user's phone in E.164 format (e.g., +12125551234). */
  phone: string;
  /** Two-letter country code (ISO 3166-1 alpha-2). */
  country: string;
  /** Full name of the user. Recommended for non-US users. */
  fullName?: string;
};

/**
 * Supported crypto networks for wallet address registration.
 */
export enum CryptoNetwork {
  bitcoin = 'bitcoin',
  ethereum = 'ethereum',
  solana = 'solana',
  polygon = 'polygon',
  stellar = 'stellar',
  avalanche = 'avalanche',
  base = 'base',
  aptos = 'aptos',
  optimism = 'optimism',
  worldchain = 'worldchain',
  xrpl = 'xrpl',
}

/**
 * Represents a calendar date using day, month, and year components.
 * Example: March 31st, 1975 -> { day: 31, month: 3, year: 1975 }
 */
export type DateOfBirth = {
  /** Day of month. */
  day: number;
  /** Month of year (1-12). */
  month: number;
  /** Full year (e.g., 1975). */
  year: number;
};

/**
 * Know Your Customer (KYC) information required for crypto operations.
 *
 * Notes:
 * - `idNumber` may be required depending on region/regulatory requirements (for US, this is SSN).
 * - `address` fields are optional at the field level, but the object is required.
 */
export type KycInfo = {
  /** Customer’s first name. */
  firstName: string;
  /** Customer’s last name. */
  lastName: string;
  /** Government ID number (e.g., SSN for US). May be required by region. */
  idNumber?: string;
  /** Customer’s date of birth. */
  dateOfBirth: DateOfBirth;
  /** Customer’s address. */
  address: Address;
};

/**
 * Result of KYC verification.
 */
export type VerifyKycResult =
  | {
      /** Verification was confirmed by the user. */
      status: 'Confirmed';
      error?: undefined;
    }
  | {
      /** An updated address is required. */
      status: 'UpdateAddress';
      error?: undefined;
    }
  | {
      status?: undefined;
      /** Present if the verification failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Common result for void-returning operations. Contains an optional error.
 */
export type VoidResult = {
  /** Present if the operation failed. */
  error?: StripeError<OnrampError>;
};

/**
 * Result of Link authorization.
 *
 * - `Consented`: The user consented; includes `customerId`.
 * - `Denied`: The user denied authorization.
 * - Error variant: Contains a Stripe error.
 */
export type AuthorizeResult =
  | {
      /** Authorization was consented by the user. */
      status: 'Consented';
      /** The crypto customer ID associated with the Link user. */
      customerId: string;
      error?: undefined;
    }
  | {
      /** Authorization was denied by the user. */
      status: 'Denied';
      customerId?: undefined;
      error?: undefined;
    }
  | {
      status?: undefined;
      customerId?: undefined;
      /** Present if the authorization failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Result of checking whether an email corresponds to an existing Link account.
 */
export type HasLinkAccountResult =
  | {
      /** True if the email is associated with an existing Link consumer. */
      hasLinkAccount: boolean;
      error?: undefined;
    }
  | {
      hasLinkAccount?: undefined;
      /** Present if the lookup failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Result of registering a new Link user.
 */
export type RegisterLinkUserResult =
  | {
      /** The crypto customer ID for the newly registered Link user. */
      customerId: string;
      error?: undefined;
    }
  | {
      customerId?: undefined;
      /** Present if registration failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Result of authenticating an existing Link user.
 */
export type AuthenticateUserResult =
  | {
      /** The crypto customer ID after successful authentication. */
      customerId: string;
      error?: undefined;
    }
  | {
      customerId?: undefined;
      /** Present if authentication failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Describes the payment method currently selected by the user.
 */
export type PaymentMethodDisplayData = {
  /**
   * Payment method icon as a data URI PNG string (e.g., "data:image/png;base64,<...>").
   * Suitable for rendering directly in an <Image> component.
   */
  icon: string;
  /** Payment method label, e.g., "Link" or "Apple Pay". */
  label: string;
  /** Details about the underlying payment method, e.g., "Visa Credit •••• 4242". */
  sublabel?: string;
};

/**
 * Result of collecting or selecting a payment method to use for checkout.
 */
export type CollectPaymentMethodResult =
  | {
      /** Display data for the selected payment method. */
      displayData: PaymentMethodDisplayData;
      error?: undefined;
    }
  | {
      displayData?: undefined;
      /** Present if collection/selection failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * Result of creating a crypto payment token for the currently selected payment method.
 */
export type CreateCryptoPaymentTokenResult =
  | {
      /** The crypto payment token ID. */
      cryptoPaymentToken: string;
      error?: undefined;
    }
  | {
      cryptoPaymentToken?: undefined;
      /** Present if token creation failed with an error. */
      error: StripeError<OnrampError>;
    };

/**
 * A representation of the crypto payment token, which contains details about the payment method used.
 */
export type CryptoPaymentToken =
  | {
      card: {
        /** The card brand (e.g., "visa", "mastercard"). Used to determine the visual brand. */
        brand: string;

        /** The funding source of the card (e.g., "credit", "debit"). */
        funding: string;

        /** The last four digits of the card number. */
        last4: string;
      };
    }
  | {
      us_bank_account: {
        /** The name of the bank (e.g., "Chase", "Bank of America"). */
        bank_name?: string | null | undefined;

        /** The last four digits of the bank account number. */
        last4: string;
      };
    };

/**
 * Result of retrieving information about a payment method for display.
 */
export type PaymentDisplayDataResult =
  | {
      /** Display data for the selected payment method. */
      displayData: PaymentMethodDisplayData;
      error?: undefined;
    }
  | {
      displayData?: undefined;
      /** Present if collection/selection failed with an error. */
      error: StripeError<OnrampError>;
    };
