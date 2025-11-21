// Types copied from @stripe/connect-js 3.3.31

export type LoaderStart = {
  elementTagName: string;
};

export type LoadError = {
  elementTagName: string;
  error: EmbeddedError;
};

export type StepChange = {
  step: string;
};

export type EmbeddedError = {
  type: EmbeddedErrorType;
  message?: string;
};

export type EmbeddedErrorType =
  /**
   * Failure to connect to Stripe's API.
   */
  | 'api_connection_error'
  /**
   * Failure to perform the authentication flow within Connect Embedded Components
   */
  | 'authentication_error'
  /**
   * Account session create failed
   */
  | 'account_session_create_error'
  /**
   * Request failed with an 4xx status code, typically caused by platform configuration issues
   */
  | 'invalid_request_error'
  /**
   * Too many requests hit the API too quickly.
   */
  | 'rate_limit_error'
  /**
   * API errors covering any other type of problem (e.g., a temporary problem with Stripe's servers), and are extremely uncommon.
   */
  | 'api_error';

export type Status =
  | 'blocked'
  | 'canceled'
  | 'disputed'
  | 'early_fraud_warning'
  | 'failed'
  | 'incomplete'
  | 'partially_refunded'
  | 'pending'
  | 'refund_pending'
  | 'refunded'
  | 'successful'
  | 'uncaptured';

export type PaymentMethod =
  | 'ach_credit_transfer'
  | 'ach_debit'
  | 'acss_debit'
  | 'affirm'
  | 'afterpay_clearpay'
  | 'alipay'
  | 'alma'
  | 'amazon_pay'
  | 'amex_express_checkout'
  | 'android_pay'
  | 'apple_pay'
  | 'au_becs_debit'
  | 'nz_bank_account'
  | 'bancontact'
  | 'bacs_debit'
  | 'bitcoin_source'
  | 'bitcoin'
  | 'blik'
  | 'boleto'
  | 'boleto_pilot'
  | 'card_present'
  | 'card'
  | 'cashapp'
  | 'crypto'
  | 'customer_balance'
  | 'demo_pay'
  | 'dummy_passthrough_card'
  | 'gbp_credit_transfer'
  | 'google_pay'
  | 'eps'
  | 'fpx'
  | 'giropay'
  | 'grabpay'
  | 'ideal'
  | 'id_bank_transfer'
  | 'id_credit_transfer'
  | 'jp_credit_transfer'
  | 'interac_present'
  | 'kakao_pay'
  | 'klarna'
  | 'konbini'
  | 'kr_card'
  | 'kr_market'
  | 'link'
  | 'masterpass'
  | 'mb_way'
  | 'meta_pay'
  | 'multibanco'
  | 'mobilepay'
  | 'naver_pay'
  | 'netbanking'
  | 'ng_bank'
  | 'ng_bank_transfer'
  | 'ng_card'
  | 'ng_market'
  | 'ng_ussd'
  | 'vipps'
  | 'oxxo'
  | 'p24'
  | 'payto'
  | 'pay_by_bank'
  | 'paper_check'
  | 'payco'
  | 'paynow'
  | 'paypal'
  | 'pix'
  | 'promptpay'
  | 'revolut_pay'
  | 'samsung_pay'
  | 'sepa_credit_transfer'
  | 'sepa_debit'
  | 'sofort'
  | 'south_korea_market'
  | 'swish'
  | 'three_d_secure'
  | 'three_d_secure_2'
  | 'three_d_secure_2_eap'
  | 'twint'
  | 'upi'
  | 'us_bank_account'
  | 'visa_checkout'
  | 'wechat'
  | 'wechat_pay'
  | 'zip';

export type PaymentsListDefaultFilters = {
  amount?:
    | { equals: number }
    | { greaterThan: number }
    | { lessThan: number }
    | { between: { lowerBound: number; upperBound: number } };
  date?:
    | { before: Date }
    | { after: Date }
    | { between: { start: Date; end: Date } };
  status?: Array<Status>;
  paymentMethod?: PaymentMethod;
};

export type CollectionOptions = {
  fields: 'currently_due' | 'eventually_due';
  futureRequirements?: 'omit' | 'include';
  requirements?:
    | {
        only: string[];
      }
    | {
        exclude: string[];
      };
};

export type StripeConnectUpdateParams = {
  /**
   * Appearance options for the Connect instance.
   */
  appearance?: AppearanceOptions;

  /**
   * The locale to use for the Connect instance.
   */
  locale?: string;
};

/**
 * Initialization parameters for Connect JS. See https://stripe.com/docs/connect/get-started-connect-embedded-components#configuring-connect-js for more details.
 */
export type StripeConnectInitParams = {
  /**
   * The publishable key for the connected account.
   */
  publishableKey: string;

  /**
   * Function that fetches client secret
   * @returns A promise that resolves with a new client secret.
   */
  fetchClientSecret: () => Promise<string>;

  /**
   * Appearance options for the Connect instance.
   * @see https://stripe.com/docs/connect/customize-connect-embedded-components
   */
  appearance?: AppearanceOptions;

  /**
   * The locale to use for the Connect instance.
   */
  locale?: string;

  /**
   * An array of custom fonts, which embedded components created from a ConnectInstance can use.
   */
  fonts?: Array<CssFontSource | CustomFontSource>;
};

/**
 * Appearance options for the Connect instance.
 */
export declare type AppearanceOptions = {
  /**
   * The type of overlay used throughout the Connect.js design system. Set this to be either a Dialog or Drawer.
   */
  overlays?: OverlayOption;
  variables?: AppearanceVariables;
};

export declare type AppearanceVariables = {
  // Commonly used

  /**
   * The font family value used throughout embedded components. If an embedded component inherits a font-family value from an element on your site in which it’s placed, this setting overrides that inheritance.
   */
  fontFamily?: string;

  /**
   * The baseline font size set on the embedded component root. This scales the value of other font size variables. This supports pixel values only ranging from 1px to 40px, 0.1em to 4em, and 0.1rem to 4rem.
   */
  fontSizeBase?: string;

  /**
   * The base spacing unit that derives all spacing values. Increase or decrease this value to make your layout more or less spacious. This supports pixel values only ranging from 8px to 20px.
   */
  spacingUnit?: string;

  /**
   * The general border radius used in embedded components. This sets the default border radius for all components. This supports pixel values only, with a maximum value of 24px.
   */
  borderRadius?: string;

  /**
   * The primary color used throughout embedded components. Set this to your primary brand color. This accepts hex values or RGB/HSL strings.
   */
  colorPrimary?: string;

  /**
   * The background color for embedded components, including overlays, tooltips, and popovers. This accepts hex values or RGB/HSL strings.
   */
  colorBackground?: string;

  /**
   * The color used for regular text. This accepts hex values or RGB/HSL strings.
   */
  colorText?: string;

  /**
   * The color used to indicate errors or destructive actions. This accepts hex values or RGB/HSL strings.
   */
  colorDanger?: string;

  // Less commonly used

  // Primary Button
  /**
   * The color used as a background for primary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonPrimaryColorBackground?: string;
  /**
   * The border color used for primary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonPrimaryColorBorder?: string;
  /**
   * The text color used for primary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonPrimaryColorText?: string;

  // Secondary Button
  /**
   * The color used as a background for secondary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonSecondaryColorBackground?: string;
  /**
   * The color used as a border for secondary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonSecondaryColorBorder?: string;
  /**
   * The text color used for secondary buttons. This accepts hex values or RGB/HSL strings.
   */
  buttonSecondaryColorText?: string;

  /**
   * The color used for secondary text. This accepts hex values or RGB/RGBA/HSL strings.
   */
  colorSecondaryText?: string;
  /**
   * The color used for primary actions and links. This accepts hex values or RGB/HSL strings.
   */
  actionPrimaryColorText?: string;
  /**
   * The line type used for text decoration of primary actions and links. This accepts a valid text decoration line value.
   */
  actionPrimaryTextDecorationLine?: string;
  /**
   * The color used for text decoration of primary actions and links. This accepts hex values or RGB/HSL strings.
   */
  actionPrimaryTextDecorationColor?: string;
  /**
   * The style of text decoration of primary actions and links. This accepts a valid text decoration style value.
   */
  actionPrimaryTextDecorationStyle?: string;
  /**
   * The thickness of text decoration of primary actions and links. This accepts a valid text decoration thickness value.
   */
  actionPrimaryTextDecorationThickness?: string;
  /**
   * The color used for secondary actions and links. This accepts hex values or RGB/HSL strings.
   */
  actionSecondaryColorText?: string;
  /**
   * The line type used for text decoration of secondary actions and links. This accepts a valid text decoration line value.
   */
  actionSecondaryTextDecorationLine?: string;
  /**
   * The color used for text decoration of secondary actions and links. This accepts hex values or RGB/HSL strings.
   */
  actionSecondaryTextDecorationColor?: string;
  /**
   * The style of text decoration of secondary actions and links. This accepts a valid text decoration style value.
   */
  actionSecondaryTextDecorationStyle?: string;
  /**
   * The thickness of text decoration of secondary actions and links. This accepts a valid text decoration thickness value.
   */
  actionSecondaryTextDecorationThickness?: string;

  // Neutral Badge Colors
  /**
   * The background color used to represent neutral state or lack of state in status badges. This accepts hex values or RGB/HSL strings.
   */
  badgeNeutralColorBackground?: string;
  /**
   * The text color used to represent neutral state or lack of state in status badges. This accepts hex values or RGB/HSL strings.
   */
  badgeNeutralColorText?: string;
  /**
   * The border color used to represent neutral state or lack of state in status badges. This accepts hex values or RGB/RGBA/HSL strings.
   */
  badgeNeutralColorBorder?: string;

  // Success Badge Colors
  /**
   * The background color used to reinforce a successful outcome in status badges. This accepts hex values or RGB/HSL strings.
   */
  badgeSuccessColorBackground?: string;
  /**
   * The text color used to reinforce a successful outcome in status badges. This accepts hex values or RGB/HSL strings.
   */
  badgeSuccessColorText?: string;
  /**
   * The border color used to reinforce a successful outcome in status badges. This accepts hex values or RGB/RGBA/HSL strings.
   */
  badgeSuccessColorBorder?: string;

  // Warning Badge Colors
  /**
   * The background color used in status badges to highlight things that might require action, but are optional to resolve. This accepts hex values or RGB/HSL strings.
   */
  badgeWarningColorBackground?: string;
  /**
   * The text color used in status badges to highlight things that might require action, but are optional to resolve. This accepts hex values or RGB/HSL strings.
   */
  badgeWarningColorText?: string;
  /**
   * The border color used in status badges to highlight things that might require action, but are optional to resolve. This accepts hex values or RGB/RGBA/HSL strings.
   */
  badgeWarningColorBorder?: string;

  // Danger Badge Colors
  /**
   * The background color used in status badges for high-priority, critical situations that the user must address immediately, and to indicate failed or unsuccessful outcomes. This accepts hex values or RGB/HSL strings.
   */
  badgeDangerColorBackground?: string;
  /**
   * The text color used in status badges for high-priority, critical situations that the user must address immediately, and to indicate failed or unsuccessful outcomes. This accepts hex values or RGB/HSL strings.
   */
  badgeDangerColorText?: string;
  /**
   * The border color used in status badges for high-priority, critical situations that the user must address immediately, and to indicate failed or unsuccessful outcomes. This accepts hex values or RGB/RGBA/HSL strings.
   */
  badgeDangerColorBorder?: string;

  // Background
  /**
   * The background color used when highlighting information, like the selected row on a table or particular piece of UI. This accepts hex values or RGB/HSL strings.
   */
  offsetBackgroundColor?: string;
  /**
   * The background color used for form items. This accepts hex values or RGB/HSL strings.
   */
  formBackgroundColor?: string;

  /**
   * The color used for borders throughout the component. This accepts hex values or RGB/RGBA/HSL strings.
   */
  colorBorder?: string;

  // Form
  /**
   * The color used to highlight form items when focused. This accepts hex values or RGB/RGBA/HSL strings.
   */
  formHighlightColorBorder?: string;
  /**
   * The color used for to fill in form items like checkboxes, radio buttons and switches. This accepts hex values or RGB/HSL strings.
   */
  formAccentColor?: string;

  // Border Sizing
  /**
   * The border radius used for buttons. This supports pixel values only.
   */
  buttonBorderRadius?: string;
  /**
   * The border radius used for form elements. This supports pixel values only, with a maximum value of 24px.
   */
  formBorderRadius?: string;
  /**
   * The border radius used for badges. This supports pixel values only, with a maximum value of 24px.
   */
  badgeBorderRadius?: string;
  /**
   * The border radius used for overlays. This supports pixel values only, with a maximum value of 24px.
   */
  overlayBorderRadius?: string;

  // Font Sizing

  // Overlay
  /**
   * A z-index to use for the overlay throughout embedded components. Set this number to control the z-order of the overlay.
   */
  overlayZIndex?: number;
  /**
   * The backdrop color when an overlay is opened. This accepts hex values or RGB/RGBA/HSL strings.
   */
  overlayBackdropColor?: string;

  // Body Typography
  /**
   * The font size for the medium body typography. Body typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  bodyMdFontSize?: string;
  /**
   * The font weight for the medium body typography. Body typography variables accept a valid font weight value.
   */
  bodyMdFontWeight?: string;
  /**
   * The font size for the small body typography. Body typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  bodySmFontSize?: string;
  /**
   * The font weight for the small body typography. Body typography variables accept a valid font weight value.
   */
  bodySmFontWeight?: string;

  // Heading Typography
  /**
   * The font size for the extra large heading typography. Heading typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  headingXlFontSize?: string;
  /**
   * The font weight for the extra large heading typography. Heading typography variables accept a valid font weight value.
   */
  headingXlFontWeight?: string;
  /**
   * The text transform for the extra large heading typography. Heading typography variables accept a valid text transform value.
   */
  headingXlTextTransform?: string;
  /**
   * The font size for the large heading typography. Heading typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  headingLgFontSize?: string;
  /**
   * The font weight for the large heading typography. Heading typography variables accept a valid font weight value.
   */
  headingLgFontWeight?: string;
  /**
   * The text transform for the large heading typography. Heading typography variables accept a valid text transform value.
   */
  headingLgTextTransform?: string;
  /**
   * The font size for the medium heading typography. Heading typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  headingMdFontSize?: string;
  /**
   * The font weight for the medium heading typography. Heading typography variables accept a valid font weight value.
   */
  headingMdFontWeight?: string;
  /**
   * The text transform for the medium heading typography. Heading typography variables accept a valid text transform value.
   */
  headingMdTextTransform?: string;
  /**
   * The font size for the small heading typography. Heading typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  headingSmFontSize?: string;
  /**
   * The font weight for the small heading typography. Heading typography variables accept a valid font weight value.
   */
  headingSmFontWeight?: string;
  /**
   * The text transform for the small heading typography. Heading typography variables accept a valid text transform value.
   */
  headingSmTextTransform?: string;
  /**
   * The font size for the extra small heading typography. Heading typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  headingXsFontSize?: string;
  /**
   * The font weight for the extra small heading typography. Heading typography variables accept a valid font weight value.
   */
  headingXsFontWeight?: string;
  /**
   * The text transform for the extra small heading typography. Heading typography variables accept a valid text transform value.
   */
  headingXsTextTransform?: string;

  // Label Typography
  /**
   * The font size for the medium label typography. Label typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  labelMdFontSize?: string;
  /**
   * The font weight for the medium label typography. Label typography variables accept a valid font weight value.
   */
  labelMdFontWeight?: string;
  /**
   * The text transform for the medium label typography. Label typography variables accept a valid text transform value.
   */
  labelMdTextTransform?: string;
  /**
   * The font size for the small label typography. Label typography variables accept a valid font size value ranging from 1px to 200px, 0.1em to 12em, and 0.1rem to 12rem.
   */
  labelSmFontSize?: string;
  /**
   * The font weight for the small label typography. Label typography variables accept a valid font weight value.
   */
  labelSmFontWeight?: string;
  /**
   * The text transform for the small label typography. Label typography variables accept a valid text transform value.
   */
  labelSmTextTransform?: string;
};

/*
 * Use a `CssFontSource` to pass custom fonts via a stylesheet URL when initializing a Connect instance.
 */
export declare type CssFontSource = {
  /**
   * A relative or absolute URL pointing to a CSS file with [@font-face](https://developer.mozilla.org/en/docs/Web/CSS/@font-face) definitions, for example:
   *
   *     https://fonts.googleapis.com/css?family=Open+Sans
   *
   * Note that if you are using a [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) (CSP), [additional directives](https://stripe.com/docs/security#content-security-policy) may be necessary.
   */
  cssSrc: string;
};

/*
 * Use a `CustomFontSource` to pass custom fonts when initializing a Connect instance.
 */
export declare type CustomFontSource = {
  /**
   * The name to give the font
   */
  family: string;

  /**
   * A valid [src](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src) value pointing to your custom font file.
   * This is usually (though not always) a link to a file with a `.woff` , `.otf`, or `.svg` suffix.
   */
  src: string;

  /**
   * A valid [font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display) value.
   */
  display?: string;

  /**
   * Defaults to `normal`.
   */
  style?: 'normal' | 'italic' | 'oblique';

  /**
   * A valid [unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range) value.
   */
  unicodeRange?: string;

  /**
   * A valid [font-weight](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight), as a string.
   */
  weight?: string;
};

export declare type OverlayOption = 'dialog' | 'drawer';

export interface StripeConnectInstance {
  /**
   * Updates the Connect instance with new parameters.
   * @options New parameters to update the Connect instance with.
   */
  update: (options: StripeConnectUpdateParams) => void;
}

export type LoadConnectAndInitialize = (
  initParams: StripeConnectInitParams
) => StripeConnectInstance;
