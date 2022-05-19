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

/**
 * Used to customize the appearance of your PaymentSheet
 */
export type AppearanceParams = RecursivePartial<{
  /** Describes the appearance of fonts in your PaymentSheet */
  font: FontConfig;
  /** Describes the colors in your PaymentSheet. Provide either a base config, or both `light` and `dark` configs, which will be useed based on whether the user is in Light or Dark mode.  */
  colors:
    | GlobalColorConfig
    | { light: GlobalColorConfig; dark: GlobalColorConfig };
  /** Describes the appearance of shapes in the PaymentSheet, such as buttons, inputs, and tabs. */
  shapes: {
    /** The border radius used for buttons, inputs, and tabs in your PaymentSheet */
    borderRadius: number;
    /** The border width used for inputs and tabs in your PaymentSheet */
    borderWidth: number;
    /** iOS only. The shadow used for buttons, inputs, and tabs in your PaymentSheet */
    shadow: ShadowConfig;
  };
  /** Describes the appearance of the primary "Pay" button at the bottom of your Payment Sheet */
  primaryButton: {
    /** The font family used specifically for the primary button */
    font: Pick<FontConfig, 'family'>;
    /** The colors used specifically for the primary button. Provide either a base config, or both `light` and `dark` configs, which will be useed based on whether the user is in Light or Dark mode.  */
    colors:
      | PrimaryButtonColorConfig
      | { light: PrimaryButtonColorConfig; dark: PrimaryButtonColorConfig };
    /** Describes the border and shadow of the primary button. */
    shapes: {
      /** The border radius used for the primary button in your PaymentSheet */
      borderRadius: number;
      /** The border width used for the primary button in your PaymentSheet */
      borderWidth: number;
      /** iOS only. The shadow used for the primary button in your PaymentSheet */
      shadow: ShadowConfig;
    };
  };
}>;

export type FontConfig = {
  /**
   * The font used for regular text. PaymentSheet will attempt to use medium and bold versions of this font if they exist.
   *
   * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
   * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
   */
  family: string;
  /** The scale factor for all fonts in your PaymentSheet, the default value is 1.0 and this value is required to be greater than 0. */
  scale: number;
};

export type ShadowConfig = {
  /** The color of the shadow. */
  color: string;
  /** The alpha or opacity of the shadow. */
  opacity: number;
  /** The positioning of the shadow relative to the component. For example, a negative x and y will result in a shadow placed below and to the left of the component. */
  offset: { x: number; y: number };
  /** The border radius of the shadow. */
  borderRadius: number;
};

export type GlobalColorConfig = {
  /** A primary color used throughout your PaymentSheet. */
  primary: string;
  /** The color used for the background of your PaymentSheet. */
  background: string;
  /** The color used for the background of inputs, tabs, and other components in your PaymentSheet. */
  componentBackground: string;
  /** The color used for the external border of inputs, tabs, and other components in your PaymentSheet. */
  componentBorder: string;
  /** The color used for the internal border (meaning the border is shared with another component) of inputs, tabs, and other components in your PaymentSheet. */
  componentDivider: string;
  /** The color of the header text in your PaymentSheet. */
  headerText: string;
  /** The color of the label text of input fields. */
  labelText: string;
  /** The color of the input text in your PaymentSheet, such as the user's card number or zip code. */
  inputText: string;
  /** The color of the placeholder text of input fields. */
  placeholderText: string;
  /** The color used for icons in your Payment Sheet, such as the close or back icons. */
  icon: string;
  /** The color used to indicate errors or destructive actions in your Payment Sheet */
  error: string;
};

export type PrimaryButtonColorConfig = {
  /** The background color used for the primary button in your PaymentSheet */
  background: string;
  /** The color of the text for the primary button in your PaymentSheet */
  text: string;
  /** The border color used for the primary button in your PaymentSheet */
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
