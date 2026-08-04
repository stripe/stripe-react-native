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
  /** When true, reduces Link branding in the sheet. @LinkControllerPreview only. */
  reduceLinkBranding?: boolean;
};
