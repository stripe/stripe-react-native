import type { Address } from './Common';
import { OnrampError, StripeError } from './Errors';

export type Configuration = {
  merchantDisplayName: string;
  appearance: LinkAppearance;
};

export type LinkAppearance = {
  lightColors?: LinkColors;
  darkColors?: LinkColors;
  style?: LinkStyle;
  primaryButton?: LinkPrimaryButton;
};

export type LinkColors = {
  primary: string;
  contentOnPrimary: string;
  borderSelected: string;
};

export type LinkStyle = 'AUTOMATIC' | 'ALWAYS_LIGHT' | 'ALWAYS_DARK';

export type LinkPrimaryButton = {
  cornerRadius?: number;
  height?: number;
};

export type LinkUserInfo = {
  email: string;
  phone: string;
  country: string;
  fullName?: string;
};

export type PaymentOptionData = {
  icon: string; // base64 string
  label: string;
  sublabel?: string;
};

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

export type DateOfBirth = {
  day: number;
  month: number;
  year: number;
};

export type KycInfo = {
  firstName: string;
  lastName: string;
  idNumber?: string;
  dateOfBirth: DateOfBirth;
  address: Address;
};

export type VoidResult = {
  error?: StripeError<OnrampError>;
};

export type AuthorizeResult =
  | {
      status: 'Consented';
      customerId: string;
      error?: undefined;
    }
  | {
      status: 'Denied';
      customerId?: undefined;
      error?: undefined;
    }
  | {
      status?: undefined;
      customerId?: undefined;
      error: StripeError<OnrampError>;
    };

export type HasLinkAccountResult =
  | {
      hasLinkAccount: boolean;
      error?: undefined;
    }
  | {
      hasLinkAccount?: undefined;
      error: StripeError<OnrampError>;
    };

export type RegisterLinkUserResult =
  | {
      customerId: string;
      error?: undefined;
    }
  | {
      customerId?: undefined;
      error: StripeError<OnrampError>;
    };

export type AuthenticateUserResult =
  | {
      customerId: string;
      error?: undefined;
    }
  | {
      customerId?: undefined;
      error: StripeError<OnrampError>;
    };

export type PaymentMethodDisplayData = {
  icon: string;
  label: string;
  sublabel?: string;
};

export type CollectPaymentMethodResult =
  | {
      displayData: PaymentMethodDisplayData;
      error?: undefined;
    }
  | {
      displayData?: undefined;
      error: StripeError<OnrampError>;
    };

export type CreateCryptoPaymentTokenResult =
  | {
      cryptoPaymentToken: string;
      error?: undefined;
    }
  | {
      cryptoPaymentToken?: undefined;
      error: StripeError<OnrampError>;
    };
