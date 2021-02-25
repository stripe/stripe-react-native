import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type Dictionary<T> = {
  [key: string]: T;
};

export type Nullable<T> = T | null;

/**
 * IntentStatus
 * @category Stripe
 */
export type CardDetails = {
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  postalCode?: string;
  brand: CardBrand;
  complete: boolean;
};

/**
 * Billing details
 * @category Stripe
 */
export type BillingDetails = {
  email?: string;
  name?: string;
  phone?: string;
  addressPostalCode?: string;
  addressCity?: string;
  addressCountry?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressState?: string;
};

/**
 * CardFieldProps
 * @category Stripe
 */
export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocusChange(
    event: NativeSyntheticEvent<{ focusedField: Nullable<FocusFieldNames> }>
  ): void;
};

/**
 * FocusFieldNames
 * @category Stripe
 */
export type FocusFieldNames =
  | 'CardNumber'
  | 'Cvc'
  | 'ExpiryDate'
  | 'PostalCode';

/**
 * IntentStatus
 * @category Stripe
 */
export enum IntentStatus {
  Succeeded = 'Succeeded',
  RequiresPaymentMethod = 'RequiresPaymentMethod',
  RequiresConfirmation = 'RequiresConfirmation',
  Canceled = 'Canceled',
  Processing = 'Processing',
  RequiresAction = 'RequiresAction',
  RequiresCapture = 'RequiresCapture',
  Unknown = 'Unknown',
}

/**
 * Address
 * @category Stripe
 */
export interface Address {
  city: string;
  county: string;
  line1: string;
  line2: string;
  postalCode: string;
  state: string;
}

/**
 * ShippingDetails
 * @category Stripe
 */
export interface ShippingDetails {
  address: Address;
  name: string;
  carrier: string;
  phone: string;
  trackingNumber: string;
}

/**
 * PaymentIntent test test
 * @category Stripe
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  created: string;
  currency: string;
  status: IntentStatus;
  description: Nullable<string>;
  receiptEmail: Nullable<string>;
  canceledAt: Nullable<string>;
  clientSecret: string;
  livemode: boolean;
  paymentMethodId: string;
  captureMethod: 'Automatic' | 'Manual';
  confirmationMethod: 'Automatic' | 'Manual';
  lastPaymentError: Nullable<LastPaymentError>;
  shipping: Nullable<ShippingDetails>;
}

/**
 * LastPaymentError
 * {@link StripeError}
 * @category Stripe
 */
export type LastPaymentError = StripeError<string> & {
  paymentMethod: PaymentMethod;
  type: PaymentIntentLastPaymentErrorType;
};

/**
 * PaymentIntentLastPaymentErrorType
 * @category Stripe
 */
type PaymentIntentLastPaymentErrorType =
  | 'ApiConnection'
  | 'Api'
  | 'Authentication'
  | 'Card'
  | 'Idempotency'
  | 'InvalidRequest'
  | 'RateLimit'
  | 'Unknown';

/**
 * SetupIntentUsage
 * @category Stripe
 */
type SetupIntentUsage =
  | 'Unknown'
  | 'None'
  | 'OnSession'
  | 'OffSession'
  | 'OneTime';

/**
 * SetupIntent test test
 * @category Stripe
 */
export interface SetupIntent {
  id: string;
  clientSecret: string;
  lastSetupError: Nullable<StripeError<string>>;
  created: Nullable<string>;
  livemode: boolean;
  paymentMethodId: Nullable<string>;
  status: IntentStatus;
  paymentMethodTypes: PaymentMethodTypes[];
  usage: SetupIntentUsage;
  description: Nullable<string>;
}

/**
 * NavigationBarStyle
 * @category Stripe
 */
export enum NavigationBarStyle {
  default = 0,
  black = 1,
  blackTranslucent = 2,
}

/**
 * NavigationBarPropsIOS
 * @category Stripe
 */
export interface NavigationBarPropsIOS {
  barStyle?: NavigationBarStyle;
  translucent?: boolean;
  barTintColor?: string;
}

/**
 * NavigationBarPropsAndroid
 * @category Stripe
 */
export interface NavigationBarPropsAndroid {
  statusBarColor?: string;
  backgroundColor?: string;
}

/**
 * ThreeDsFooterProps
 * {@link NavigationBarPropsAndroid NavigationBarPropsAndroid}
 * {@link NavigationBarPropsIOS NavigationBarPropsIOS}
 * @category Stripe
 */
export interface NavigationBarProps
  extends NavigationBarPropsAndroid,
    NavigationBarPropsIOS {
  headerText?: string;
  buttonText?: string;
  textColor?: string;
  textFontSize?: number;
}

/**
 * ThreeDsFooterProps
 * @category Stripe
 */
export interface ThreeDsFooterProps {
  backgroundColor?: string;
  chevronColor?: string;
  headingTextColor?: string;
  textColor?: string;
}

/**
 * ThreeDSecureMainPropsIOS
 * @category Stripe
 */
export interface ThreeDSecureMainPropsIOS {
  backgroundColor?: string;
  footer?: ThreeDsFooterProps;
}

/**
 * ThreeDSecureMainPropsAndroid
 * @category Stripe
 */
export interface ThreeDSecureMainPropsAndroid {
  accentColor?: string;
}

/**
 * ThreeDSecureMainProps
 * {@link ThreeDSecureMainPropsIOS ThreeDSecureMainPropsIOS}
 * {@link ThreeDSecureMainPropsAndroid ThreeDSecureMainPropsAndroid}
 * @category Stripe
 */
export interface ThreeDSecureMainProps
  extends ThreeDSecureMainPropsIOS,
    ThreeDSecureMainPropsAndroid {}

/**
 * ThreeDsLabelProps
 * @category Stripe
 */
interface ThreeDsLabelProps {
  headingTextColor?: string;
  textColor?: string;
  textFontSize?: number;
  headingFontSize?: number;
}

/**
 * ThreeDSecureTextFieldProps
 * @category Stripe
 */
interface ThreeDSecureTextFieldProps {
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  textColor?: string;
  textFontSize?: number;
}

/**
 * ThreeDSecureSubmitButtonProps
 * @category Stripe
 */
interface ThreeDSecureSubmitButtonProps {
  backgroundColor?: string;
  cornerRadius?: number;
  textColor?: string;
  textFontSize?: number;
}

/**
 * ThreeDSecureConfigurationParams
 * {@link ThreeDSecureMainProps ThreeDSecureMainProps}
 * @category Stripe
 */
export interface ThreeDSecureConfigurationParams extends ThreeDSecureMainProps {
  timeout?: number;
  label?: ThreeDsLabelProps;
  navigationBar?: NavigationBarProps;
  textField?: ThreeDSecureTextFieldProps;
  submitButton?: ThreeDSecureSubmitButtonProps;
}

/**
 * PaymentMethodOptions
 * @category Stripe
 */
export interface PaymentMethodOptions {}

/**
 * PaymentMethodOptions
 * @category Stripe
 */
export type PaymentMethodData = PaymentMethodCardData | PaymentMethodAliPayData;

/**
 * SetupIntentUsage
 * @typeParam T member of PaymentMethodTypes
 * @category Stripe
 */
export interface PaymentMethodBaseData<T extends PaymentMethodTypes> {
  type: T;
  billingDetails?: BillingDetails;
}

/**
 * PaymentMethodCardData
 * @category Stripe
 */
export type PaymentMethodCardData =
  | (PaymentMethodBaseData<'Card'> & {
      cardDetails: CardDetails;
    })
  | (PaymentMethodBaseData<'Card'> & {
      paymentMethodId: string;
    });

/**
 * PaymentMethodAliPayData
 * {@link PaymentMethodBaseData}
 * @category Stripe
 */
export interface PaymentMethodAliPayData
  extends PaymentMethodBaseData<'Alipay'> {}

/**
 * PaymentMethodTypes
 * @category Stripe
 */
export type PaymentMethodTypes =
  | 'AfterpayClearpay'
  | 'Card'
  | 'Alipay'
  | 'Grabpay'
  | 'Ideal'
  | 'Fpx'
  | 'CardPresent'
  | 'SepaDebit'
  | 'AuBecsDebit'
  | 'BacsDebit'
  | 'Giropay'
  | 'P24'
  | 'Eps'
  | 'Bancontact'
  | 'Oxxo'
  | 'Sofort'
  | 'Upi'
  | 'Unknown';

type CardBrand =
  | 'AmericanExpress'
  | 'DinersClub'
  | 'Discover'
  | 'JCB'
  | 'MasterCard'
  | 'UnionPay'
  | 'Visa'
  | 'Unknown';

/**
 * PaymentMethod
 * @category Stripe
 */
export interface PaymentMethod {
  id: string;
  livemode: boolean;
  customerId: string;
  billingDetails: {
    email?: string;
    phone?: string;
    name?: string;
    address?: Address;
  };
  type: PaymentMethodTypes;
  AuBecsDebit: {
    fingerprint?: string;
    last4?: string;
    bsbNumber?: string;
  };
  BacsDebit: {
    sortCode?: string;
    last4?: string;
    fingerprint?: string;
  };
  Card: {
    brand?: CardBrand;
    country?: string;
    expYear?: string;
    expMonth?: string;
    fingerprint?: string;
    funding?: string;
    last4?: string;
  };
  Fpx: {
    bank?: string;
  };
  Ideal: {
    bankIdentifierCode?: string;
    bank?: string;
  };
  SepaDebit: {
    bankCode?: string;
    country?: string;
    fingerprint?: string;
    last4?: string;
  };
  Sofort: {
    country?: string;
  };
  Upi: {
    vpa?: string;
  };
}

/**
 * ConfirmPaymentError
 * @category Stripe
 */
export enum ConfirmPaymentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * CardActionError
 * @category Stripe
 */
export enum CardActionError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * ConfirmSetupIntentError
 * @category Stripe
 */
export enum ConfirmSetupIntentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * RetrievePaymentIntentError
 * @category Stripe
 */
export enum RetrievePaymentIntentError {
  Canceled = 'Canceled',
}

/**
 * ApplePayError
 * @category Stripe
 */

export enum ApplePayError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * CreatePaymentMethodError
 * @category Stripe
 */
export enum CreatePaymentMethodError {
  Failed = 'Failed',
}

/**
 * StripeError
 * @typeParam T type of error code.
 * @category Stripe
 */
export type StripeError<T> = {
  message: string;
  code: T;
};

/**
 * ApplePayButtonProps
 * @category Stripe
 */
export type ApplePayButtonProps = {
  style?: StyleProp<ViewStyle>;
  type?: number;
  buttonStyle?: number;
  onPressAction(): void;
};

/**
 * ShippingMethodType
 * @category Stripe
 */
type ShippingMethodType = 'final' | 'pending';

/**
 * ContactFieldsType
 * @category Stripe
 */
type ContactFieldsType =
  | 'emailAddress'
  | 'name'
  | 'phoneNumber'
  | 'phoneticName'
  | 'postalAddress';

/**
 * ShippingMethod
 * @category Stripe
 */
export interface ShippingMethod {
  label: string;
  amount: string;
  type?: ShippingMethodType;
  identifier: string;
  detail?: string;
}

/**
 * PresentApplePayParams
 * @category Stripe
 */
export interface PresentApplePayParams {
  cartItems: CartSummaryItem[];
  country: string;
  currency: string;
  requiredShippingAddressFields?: ContactFieldsType[];
  requiredBillingContactFields?: ContactFieldsType[];
  shippingMethods?: ShippingMethod[];
}

/**
 * ApplePayButtonType
 * @category Stripe
 */
export type ApplePayButtonType =
  | 'plain'
  | 'buy'
  | 'setUp'
  | 'inStore'
  | 'donate'
  | 'checkout'
  | 'book'
  | 'subscribe'
  | 'reload'
  | 'addMoney'
  | 'topUp'
  | 'order'
  | 'rent'
  | 'support'
  | 'contribute'
  | 'tip';

/**
 * ApplePayButtonStyle
 * @category Stripe
 */
export type ApplePayButtonStyle =
  | 'white'
  | 'whiteOutline'
  | 'black'
  | 'automatic';

/**
 * CartSummaryItem
 * @category Stripe
 */
export type CartSummaryItem = {
  label: string;
  amount: string;
};

/**
 * AppInfo
 * @category Stripe
 */
export type AppInfo = Partial<{
  name: string;
  partnerId: string;
  url: string;
  version: string;
}>;
