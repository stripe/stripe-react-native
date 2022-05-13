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
  } & RecursivePartial<AppearanceParams>;

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

export type AppearanceParams = {
  appearance: {
    font: {
      /**
       * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
       * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
       */
      family: string;
      scale: number;
    };
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
      font: {
        /**
         * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
         * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
         */
        family: string;
      };
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
  };
};

type ShadowConfig = {
  color: string;
  opacity: number;
  offset: { x: number; y: number };
  borderRadius: number;
};

type GlobalColorConfig = {
  primary: string;
  background: string;
  componentBackground: string;
  componentBorder: string;
  componentDivider: string;
  text: string; // maybe headerText
  textSecondary: string; // maybe labelText
  componentText: string;
  componentPlaceholderText: string;
  icon: string;
  error: string;
};

type PrimaryButtonColorConfig = {
  background: string;
  text: string;
  componentBorder: string;
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
