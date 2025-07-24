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
    /** The border radius used for buttons, inputs, and tabs in your PaymentSheet.
     * @default 6.0
     */
    borderRadius: number;
    /** The border width used for inputs and tabs in your PaymentSheet.
     * @default 1.0
     */
    borderWidth: number;
    /** iOS only. The shadow used for buttons, inputs, and tabs in your PaymentSheet */
    shadow: ShadowConfig;
  };
  /** Describes the appearance of the primary "Pay" button at the bottom of your Payment Sheet */
  primaryButton: PrimaryButtonConfig;

  /** Describes the appearance of the Embedded Mobile Payment Element */
  embeddedPaymentElement: EmbeddedPaymentElementAppearance;

  /** Describes the inset values applied to Mobile Payment Element forms */
  formInsetValues: EdgeInsetsConfig;
}>;

export type FontConfig = {
  /**
   * The font used for regular text. PaymentSheet will attempt to use medium and bold versions of this font if they exist.
   *
   * On iOS, this should be the "PostScript name" found in Font Book after installing the font.
   * On Android, this should be the name of the font file (containing only lowercase alphanumeric characters) in android/app/src/main/res/font
   *
   * @default The OS's system font
   */
  family: string;
  /** The scale factor for all fonts in your PaymentSheet. This value is required to be greater than 0. Font sizes are multiplied by this value before being displayed. For example, setting this to 1.2 increases the size of all text by 20%.
   * @default 1.0
   */
  scale: number;
};

export type ShadowConfig = {
  /** The color of the shadow.
   * @default "#000000"
   * */
  color: string;
  /** The alpha or opacity of the shadow.
   * @default 0.05
   */
  opacity: number;
  /** The positioning of the shadow relative to the component. For example, a negative x and y will result in a shadow placed below and to the left of the component.
   * @default {x: 0, y: 2}
   */
  offset: { x: number; y: number };
  /** The blur radius of the shadow.
   * @default 4
   */
  blurRadius: number;
};

export type GlobalColorConfig = {
  /** A primary color used throughout your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System blue color on iOS, and "#007AFF" (light) / "#0074D4" (dark) on Android.
   */
  primary: string;
  /** The color used for the background of your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System background color on iOS, and "#ffffff" (light) / "#2e2e2e" (dark) on Android.
   */
  background: string;
  /** The color used for the background of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System background color (light) / System secondary background color (dark) on iOS, and "#ffffff" (light) / "#a9a9a9" (dark) on Android.
   */
  componentBackground: string;
  /** The color used for the external border of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System gray (3) color on iOS, and "#33787880" (light) / "#787880" (dark) on Android.
   */
  componentBorder: string;
  /** The color used for the internal border (meaning the border is shared with another component) of inputs, tabs, and other components in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System gray (3) color on iOS, and "#33787880" (light) / "#787880" (dark) on Android.
   */
  componentDivider: string;
  /** The color of the header text in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System label color on iOS, and "#000000" (light) / "#ffffff" (dark) on Android.
   */
  primaryText: string;
  /** The color of the label text of input fields, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System seconday label color on iOS, and "#000000" (light) / "#ffffff" (dark) on Android.
   */
  secondaryText: string;
  /** The color of the input text in your PaymentSheet components, such as the user's card number or zip code, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default "#000000"
   */
  componentText: string;
  /** The color of the placeholder text of input fields, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System label color on iOS, and "#99000000" (light) / "#99ffffff" (dark) on Android.
   */
  placeholderText: string;
  /** The color used for icons in your Payment Sheet, such as the close or back icons, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System seconday label color on iOS, and "#99000000" (light) / "#ffffff" (dark) on Android.
   */
  icon: string;
  /** The color used to indicate errors or destructive actions in your Payment Sheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System red color on iOS, and "#ff0000" (light) / "#ff0000" (dark) on Android.
   */
  error: string;
};

export type PrimaryButtonConfig = {
  /** The font family used specifically for the primary button.
   * @default The root `appearance.font.family`
   */
  font: Pick<FontConfig, 'family'>;
  /** The colors used specifically for the primary button. Provide either a base config, or both `light` and `dark` configs, which will be useed based on whether the user is in Light or Dark mode.  */
  colors:
    | PrimaryButtonColorConfig
    | { light: PrimaryButtonColorConfig; dark: PrimaryButtonColorConfig };
  /** Describes the border and shadow of the primary button. */
  shapes: {
    /** The border radius used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.borderRadius`
     */
    borderRadius: number;
    /** The border width used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.borderWidth`
     */
    borderWidth: number;
    /** iOS only. The shadow used for the primary button in your PaymentSheet
     * @default The root `appearance.shapes.shadow`
     */
    shadow: ShadowConfig;
    /**
     * The height of the primary button
     * @default 48
     */
    height: number;
  };
};

export type PrimaryButtonColorConfig = {
  /** The background color used for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The root `appearance.colors.primary`
   */
  background: string;
  /** The color of the text for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default White or black, depending on the color of the button.
   */
  text: string;
  /** The border color used for the primary button in your PaymentSheet, represented as a hex string with format #RRGGBB or #AARRGGBB.
   * @default The System quaternary label on iOS, transparent on Android.
   */
  border: string;
};

/** A color that’s either a single hex or a light/dark pair */
export type ThemedColor = string | { light: string; dark: string };

/** Represents edge insets */
export interface EdgeInsetsConfig {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

/** Display styles for rows in the Embedded Mobile Payment Element */
export enum RowStyle {
  /** A flat style with radio buttons */
  FlatWithRadio = 'flatWithRadio',
  /** A floating button style */
  FloatingButton = 'floatingButton',
  /** A flat style with a checkmark */
  FlatWithCheckmark = 'flatWithCheckmark',
  /** A flat style with a chevron
   * Note that the EmbeddedPaymentElementConfiguration.rowSelectionBehavior must be set to `immediateAction` to use this style.
   */
  FlatWithDisclosure = 'flatWithDisclosure',
}

/** Describes the appearance of the radio button */
export interface RadioConfig {
  /** The color of the radio button when selected, represented as a hex string #AARRGGBB or #RRGGBB.
   * @default The root appearance.colors.primary
   */
  selectedColor?: ThemedColor;

  /** The color of the radio button when unselected, represented as a hex string #AARRGGBB or #RRGGBB.
   * @default The root appearance.colors.componentBorder
   */
  unselectedColor?: ThemedColor;
}

/** Describes the appearance of the checkmark */
export interface CheckmarkConfig {
  /** The color of the checkmark when selected, represented as a hex string #AARRGGBB or #RRGGBB.
   * @default The root appearance.colors.primary
   */
  color?: ThemedColor;
}

/** Describes the appearance of the disclosure indicator */
export interface DisclosureConfig {
  /** The color of the disclosure indicator, represented as a hex string #AARRGGBB or #RRGGBB.
   * @default The iOS or Android system gray color
   */
  color?: ThemedColor;
}

/** Describes the appearance of the flat style row */
export interface FlatConfig {
  /** The thickness of the separator line between rows.
   * @default 1.0
   */
  separatorThickness?: number;

  /** The color of the separator line between rows, represented as a hex string #AARRGGBB or #RRGGBB.
   * @default The root appearance.colors.componentBorder
   */
  separatorColor?: ThemedColor;

  /** The insets of the separator line between rows.
   * @default { top: 0, left: 30, bottom: 0, right: 0 } for RowStyle.FlatWithRadio
   * @default { top: 0, left: 0, bottom: 0, right: 0 } for RowStyle.FlatWithCheckmark, RowStyle.FlatWithChevron, and RowStyle.FloatingButton
   */
  separatorInsets?: EdgeInsetsConfig;

  /** Determines if the top separator is visible at the top of the Element.
   * @default true
   */
  topSeparatorEnabled?: boolean;

  /** Determines if the bottom separator is visible at the bottom of the Element.
   * @default true
   */
  bottomSeparatorEnabled?: boolean;

  /** Appearance settings for the radio button (used when RowStyle is FlatWithRadio) */
  radio?: RadioConfig;

  /** Appearance settings for the checkmark (used when RowStyle is FlatWithCheckmark) */
  checkmark?: CheckmarkConfig;

  /** Appearance settings for the disclosure indicator (used when RowStyle is FlatWithDisclosure) */
  disclosure?: DisclosureConfig;
}

/** Describes the appearance of the floating button style payment method row */
export interface FloatingConfig {
  /** The spacing between payment method rows.
   * @default 12.0
   */
  spacing?: number;
}

/** Describes the appearance of the row in the Embedded Mobile Payment Element */
export interface RowConfig {
  /** The display style of the row.
   * @default RowStyle.FlatWithRadio
   */
  style?: RowStyle;

  /** Additional vertical insets applied to a payment method row.
   * Increasing this value increases the height of each row.
   * @default 6.0
   */
  additionalInsets?: number;

  /** Appearance settings for the flat style row */
  flat?: FlatConfig;

  /** Appearance settings for the floating button style row */
  floating?: FloatingConfig;
}

/** Describes the appearance of the Embedded Mobile Payment Element */
export interface EmbeddedPaymentElementAppearance {
  /** Describes the appearance of the row in the Embedded Mobile Payment Element */
  row?: RowConfig;
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P];
};
