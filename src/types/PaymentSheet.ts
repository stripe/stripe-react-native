import type { BillingDetails } from './Common';

export type SetupParams = ClientSecretParams &
  GooglePayParams &
  ApplePayParams & {
    customerId?: string;
    customerEphemeralKeySecret?: string;
    customFlow?: boolean;
    merchantDisplayName?: string;
    style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
    returnURL?: string;
    defaultBillingDetails?: BillingDetails;
    allowsDelayedPaymentMethods?: boolean;
  } & { appearance?: AppearanceParams };

type ClientSecretParams =
  | {
      paymentIntentClientSecret: string;
      setupIntentClientSecret?: undefined;
    }
  | {
      setupIntentClientSecret: string;
      paymentIntentClientSecret?: undefined;
    };

type ApplePayParams =
  | {
      applePay?: true;
      merchantCountryCode: string;
    }
  | {
      applePay?: false;
      merchantCountryCode?: string;
    };

type GooglePayParams =
  | {
      googlePay?: true;
      merchantCountryCode: string;
      currencyCode?: string;
      testEnv?: boolean;
    }
  | {
      googlePay?: false;
      merchantCountryCode?: string;
      currencyCode?: string;
      testEnv?: boolean;
    };

export type AppearanceParams = RecursivePartial<{
  font: FontConfig;
  colors:
    | GlobalColorConfig
    | { light: GlobalColorConfig; dark: GlobalColorConfig };
  shapes: {
    borderRadius: number;
    borderWidth: number;
    // iOS Only
    shadow: ShadowConfig;
  };
  primaryButton: {
    font: Pick<FontConfig, 'family'>;
    colors:
      | PrimaryButtonColorConfig
      | { light: PrimaryButtonColorConfig; dark: PrimaryButtonColorConfig };
    shapes: {
      borderRadius: number;
      borderWidth: number;
      // iOS Only
      shadow: ShadowConfig;
    };
  };
}>;

export type FontConfig = {
  /**
   * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
   * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
   */
  family: string;
  scale: number;
};

export type ShadowConfig = {
  color: string;
  opacity: number;
  offset: { x: number; y: number };
  radius: number;
};

export type GlobalColorConfig = {
  primary: string;
  background: string;
  componentBackground: string;
  componentBorder: string;
  componentDivider: string;
  headerText: string;
  labelText: string;
  inputText: string;
  placeholderText: string;
  icon: string;
  error: string;
};

export type PrimaryButtonColorConfig = {
  background: string;
  text: string;
  border: string;
};

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
export interface PaymentOption {
  label: string;
  image: string;
}
