import type { Address } from './Common';
import type { StripeError } from './Errors';
import type {
  ApplePayBaseParams,
  ApplePayPaymentMethodParams,
} from './PlatformPay';

/**
 * Generic error statuses returned by Crypto Onramp APIs.
 */
export enum OnrampErrorStatus {
  Failed = 'Failed',
  Canceled = 'Canceled',
  Unknown = 'Unknown',
}

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
  /** Google Pay configuration. Required on Android to enable Google Pay as a payment method. */
  googlePay?: GooglePayConfig;
};

/**
 * Configuration for Google Pay within the onramp flow.
 */
export type GooglePayConfig = {
  /** Whether to use the test environment. Defaults to false. */
  testEnv?: boolean;
  /** Two-letter ISO 3166-1 alpha-2 country code of the merchant. */
  merchantCountryCode: string;
  /** Merchant name displayed in the Google Pay sheet. */
  merchantName: string;
  /** Set to true to request an email address. Defaults to false. */
  isEmailRequired?: boolean;
  /** Set to false if you don't support credit cards. Defaults to true. */
  allowCreditCards?: boolean;
  /** Whether an existing payment method is required. Defaults to true. */
  existingPaymentMethodRequired?: boolean;
  /** Billing address collection configuration. */
  billingAddressConfig?: GooglePayBillingAddressConfig;
};

/**
 * Billing address configuration for Google Pay.
 */
export type GooglePayBillingAddressConfig = {
  /** Whether a billing address is required. Defaults to false. */
  isRequired?: boolean;
  /** Format of the billing address. Defaults to 'Min'. */
  format?: 'Min' | 'Full';
  /** Whether a phone number is required. Defaults to false. */
  isPhoneNumberRequired?: boolean;
};

/**
 * Google Pay parameters for the onramp collectPaymentMethod call.
 * Only includes the fields passed to GooglePayPaymentMethodLauncher.present().
 * Google Pay config (merchantCountryCode, testEnv, etc.) belongs in GooglePayConfig
 * provided to configure().
 */
export type OnrampGooglePayParams = {
  /** ISO 4217 alphabetic currency code (e.g. "USD"). */
  currencyCode: string;
  /** Amount in the currency's smallest unit. */
  amount: number;
  /** An optional label to display with the amount. */
  label?: string;
  /** A unique ID that identifies a transaction attempt. Required when sending callbacks to the Google Transaction Events API. */
  transactionId?: string;
};

/**
 * Platform Pay parameters for the onramp collectPaymentMethod call.
 */
export type OnrampPlatformPayParams = {
  /**
   * Google Pay parameters. Android only.
   */
  googlePay?: OnrampGooglePayParams;
  /**
   * Apple Pay parameters. iOS only.
   * To receive `kycInfo` back from `collectPaymentMethod`, request Apple Pay billing
   * `.name` and/or `.postalAddress` via `requiredBillingContactFields`.
   */
  applePay?: ApplePayBaseParams & ApplePayPaymentMethodParams;
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
  sui = 'sui',
  arbitrum = 'arbitrum',
}

/**
 * A short-lived server-issued challenge used to prove ownership of a registered wallet.
 */
export type WalletOwnershipChallenge = {
  /** Opaque identifier for this challenge. */
  challengeId: string;
  /** The wallet address bound to this challenge. */
  walletAddress: string;
  /** The crypto network bound to this challenge. */
  network: CryptoNetwork;
  /** The exact opaque message the wallet must sign. */
  message: string;
  /** ISO 8601 timestamp indicating when this challenge expires. */
  expiresAt: string;
};

/**
 * A registered crypto consumer wallet.
 */
export type CryptoConsumerWallet = {
  /** The consumer wallet's unique identifier. */
  id: string;
  /** The registered wallet address. */
  walletAddress: string;
  /** The crypto network for the registered wallet. */
  network: CryptoNetwork;
  /** Whether ownership of this wallet has been verified. */
  verifiedOwnership: boolean;
};

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
 * - All fields are optional at the transport layer; provide the fields you have collected so far.
 * - `idNumber` may be required depending on region/regulatory requirements (for US, this is SSN).
 */
export type KycInfo = {
  /** Customer’s first name, if collected. */
  firstName?: string;
  /** Customer’s last name, if collected. */
  lastName?: string;
  /** Government ID number (e.g., SSN for US). May be required by region. */
  idNumber?: string;
  /** Customer’s date of birth, if collected. */
  dateOfBirth?: DateOfBirth;
  /** Customer’s address, if collected. */
  address?: Address;
  /** Two-letter ISO 3166-1 alpha-2 code for the country where the customer was born. */
  birthCountry?: string;
  /** City where the customer was born. */
  birthCity?: string;
  /** Two-letter ISO 3166-1 alpha-2 codes for the customer's nationalities. */
  nationalities?: string[];
};

/**
 * The type of compliance identifier required or submitted for regulatory compliance.
 */
export type ComplianceIdentifierType = string;

/**
 * The regulation requiring a compliance identifier.
 */
export type ComplianceRegulation = 'eu_carf' | 'eu_mica';

/**
 * A compliance identifier collected for MiCA or CRS/CARF compliance.
 */
export type ComplianceIdentifier = {
  /** The type of identifier provided. */
  type: ComplianceIdentifierType;
  /** The identifier value. */
  value: string;
};

/**
 * A compliance identifier the customer still needs to provide.
 */
export type ComplianceIdentifierRequirement = {
  /** The type of identifier required. */
  type: ComplianceIdentifierType;
  /** The regulation requiring this identifier. */
  regulation: ComplianceRegulation;
};

/**
 * A group describing alternative identifier types that may satisfy a requirement.
 */
export type ComplianceIdentifierAlternativeGroup = {
  /** The original identifier types required. */
  originalMissingIdentifiers: ComplianceIdentifierType[];
  /** Alternative identifier types that may satisfy the original requirement. */
  alternativeMissingIdentifiers: ComplianceIdentifierType[];
};

/**
 * The compliance identifiers a customer still needs to provide.
 */
export type ComplianceIdentifierRequirements = {
  /** Required identifier types and the regulations requiring them. */
  identifiers: ComplianceIdentifierRequirement[];
  /** Alternative identifier groups that may satisfy one or more requirements. */
  alternatives: ComplianceIdentifierAlternativeGroup[];
  /** Whether at least one CRS/CARF tax identification number still needs to be collected. */
  carfTinRequired: boolean;
};

/**
 * Typed Crypto Onramp API error discriminants.
 */
export type OnrampApiErrorType =
  | 'AppAttestationError'
  | 'UncategorizedApiError';

/**
 * Typed Crypto Onramp error discriminants returned by newer native SDKs.
 */
export type OnrampErrorType =
  | OnrampApiErrorType
  | 'AppAttestationUnavailableError';

/**
 * Base rich error shape returned by native Crypto Onramp SDK errors.
 */
export type OnrampSdkError = StripeError<OnrampErrorStatus> & {
  onrampErrorType: OnrampErrorType;
  developerMessage: string;
  userMessage: string;
  docUrl?: string;
};

/**
 * API-context fields returned for Crypto Onramp API errors.
 */
export type OnrampApiError = OnrampSdkError & {
  onrampErrorType: OnrampApiErrorType;
  reason?: string;
  requestId?: string;
  apiErrorCode?: string;
  apiErrorType?: string;
  apiErrorMessage?: string;
  apiUserMessage?: string;
};

/**
 * A typed Crypto Onramp app attestation failure.
 */
export type AppAttestationError = OnrampApiError & {
  onrampErrorType: 'AppAttestationError';
};

/**
 * A typed Crypto Onramp API error that did not map to a narrower category.
 */
export type UncategorizedApiError = OnrampApiError & {
  onrampErrorType: 'UncategorizedApiError';
};

/**
 * A typed Crypto Onramp local SDK error for app attestation setup failures.
 */
export type AppAttestationUnavailableError = OnrampSdkError & {
  onrampErrorType: 'AppAttestationUnavailableError';
};

/**
 * Error returned by Crypto Onramp APIs.
 *
 * Most failures use the generic Stripe error envelope. Newer native SDK
 * versions may instead return typed SDK-owned errors via
 * `onrampErrorType`.
 */
export type CryptoOnrampError =
  | (StripeError<OnrampErrorStatus> & {
      onrampErrorType?: never;
      developerMessage?: never;
      userMessage?: never;
    })
  | AppAttestationError
  | UncategorizedApiError
  | AppAttestationUnavailableError;

/**
 * Result of retrieving missing compliance identifiers.
 */
export type RetrieveMissingIdentifiersResult =
  | (ComplianceIdentifierRequirements & {
      error?: undefined;
    })
  | {
      identifiers?: undefined;
      alternatives?: undefined;
      carfTinRequired?: undefined;
      /** Present if retrieval failed with an error. */
      error: CryptoOnrampError;
    };

/**
 * Result of submitting compliance identifiers for MiCA and CRS/CARF compliance.
 */
export type SubmitIdentifiersResult =
  | {
      /** Whether all required MiCA identifiers and CRS/CARF tax identification numbers have been submitted. */
      completed: boolean;
      /** Any identifiers that still need to be collected. */
      identifiers: ComplianceIdentifierRequirement[];
      /** Alternative identifier groups that may satisfy one or more requirements. */
      alternatives: ComplianceIdentifierAlternativeGroup[];
      /** Whether at least one CRS/CARF tax identification number still needs to be collected. */
      carfTinRequired: boolean;
      /** Submitted identifier types whose values were invalid. */
      invalidIdentifiers: ComplianceIdentifierType[];
      error?: undefined;
    }
  | {
      completed?: undefined;
      identifiers?: undefined;
      alternatives?: undefined;
      carfTinRequired?: undefined;
      invalidIdentifiers?: undefined;
      /** Present if submission failed with an error. */
      error: CryptoOnrampError;
    };

/**
 * Result of presenting user attestation.
 */
export type UserAttestationResult =
  | {
      /** The customer accepted the attestation. */
      status: 'Confirmed';
      error?: undefined;
    }
  | {
      status?: undefined;
      /** Present if attestation failed or was cancelled. */
      error: CryptoOnrampError;
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
      error: CryptoOnrampError;
    };

/**
 * Common result for void-returning operations. Contains an optional error.
 */
export type VoidResult = {
  /** Present if the operation failed. */
  error?: CryptoOnrampError;
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
      error: CryptoOnrampError;
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
      error: CryptoOnrampError;
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
      error: CryptoOnrampError;
    };

/**
 * Result of creating a wallet ownership challenge.
 */
export type GetWalletOwnershipChallengeResult =
  | {
      /** The short-lived challenge whose message must be signed by the wallet. */
      challenge: WalletOwnershipChallenge;
      error?: undefined;
    }
  | {
      challenge?: undefined;
      /** Present if challenge creation failed with an error. */
      error: CryptoOnrampError;
    };

/**
 * Result of submitting a wallet ownership signature.
 */
export type SubmitWalletOwnershipSignatureResult =
  | {
      /** The registered wallet after ownership verification. */
      consumerWallet: CryptoConsumerWallet;
      error?: undefined;
    }
  | {
      consumerWallet?: undefined;
      /** Present if signature verification failed with an error. */
      error: CryptoOnrampError;
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
  /** The type of payment method */
  type: 'Card' | 'BankAccount' | 'ApplePay' | 'GooglePay';
};

/**
 * Result of collecting or selecting a payment method to use for checkout.
 */
export type CollectPaymentMethodResult =
  | {
      /** Display data for the selected payment method. */
      displayData: PaymentMethodDisplayData;
      /** Partial KYC data returned from Platform Pay billing details, when requested. */
      kycInfo?: KycInfo;
      error?: undefined;
    }
  | {
      displayData?: undefined;
      kycInfo?: undefined;
      /** Present if collection/selection failed with an error. */
      error: CryptoOnrampError;
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
      error: CryptoOnrampError;
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
      error: CryptoOnrampError;
    };
