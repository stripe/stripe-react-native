import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type Dictionary<T> = {
  [key: string]: T;
};

export type Nullable<T> = T | null;

/**
 * IntentStatus
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
 * @ignore
 */
export type CardFieldNativeProps = {
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
 */
export type FocusFieldNames =
  | 'CardNumber'
  | 'Cvc'
  | 'ExpiryDate'
  | 'PostalCode';

/**
 * IntentStatus
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
 */
export interface LastPaymentError extends StripeError<string> {
  paymentMethod: PaymentMethod;
  type: PaymentIntentLastPaymentErrorType;
}

/**
 * PaymentIntentLastPaymentErrorType
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
 */
type SetupIntentUsage =
  | 'Unknown'
  | 'None'
  | 'OnSession'
  | 'OffSession'
  | 'OneTime';

/**
 * SetupIntent test test
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
 */
export enum NavigationBarStyle {
  default = 0,
  black = 1,
  blackTranslucent = 2,
}

/**
 * NavigationBarPropsIOS
 */
export interface NavigationBarPropsIOS {
  barStyle?: NavigationBarStyle;
  translucent?: boolean;
  barTintColor?: string;
}

/**
 * NavigationBarPropsAndroid
 */
export interface NavigationBarPropsAndroid {
  statusBarColor?: string;
  backgroundColor?: string;
}

/**
 * ThreeDsFooterProps
 * {@link NavigationBarPropsAndroid NavigationBarPropsAndroid}
 * {@link NavigationBarPropsIOS NavigationBarPropsIOS}
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
 */
export interface ThreeDsFooterProps {
  backgroundColor?: string;
  chevronColor?: string;
  headingTextColor?: string;
  textColor?: string;
}

/**
 * ThreeDSecureMainPropsIOS
 */
export interface ThreeDSecureMainPropsIOS {
  backgroundColor?: string;
  footer?: ThreeDsFooterProps;
}

/**
 * ThreeDSecureMainPropsAndroid
 */
export interface ThreeDSecureMainPropsAndroid {
  accentColor?: string;
}

/**
 * ThreeDSecureMainProps
 * {@link ThreeDSecureMainPropsIOS ThreeDSecureMainPropsIOS}
 * {@link ThreeDSecureMainPropsAndroid ThreeDSecureMainPropsAndroid}
 */
export interface ThreeDSecureMainProps
  extends ThreeDSecureMainPropsIOS,
    ThreeDSecureMainPropsAndroid {}

/**
 * ThreeDsLabelProps
 */
export interface ThreeDsLabelProps {
  headingTextColor?: string;
  textColor?: string;
  textFontSize?: number;
  headingFontSize?: number;
}

/**
 * ThreeDSecureTextFieldProps
 */
export interface ThreeDSecureTextFieldProps {
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  textColor?: string;
  textFontSize?: number;
}

/**
 * ThreeDSecureSubmitButtonProps
 */
export interface ThreeDSecureSubmitButtonProps {
  backgroundColor?: string;
  cornerRadius?: number;
  textColor?: string;
  textFontSize?: number;
}

/**
 * ThreeDSecureConfigurationParams
 * {@link ThreeDSecureMainProps ThreeDSecureMainProps}
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
 */
export interface PaymentMethodOptions {}

/**
 * PaymentMethodData
 */
export type PaymentMethodData = PaymentMethodCardData | PaymentMethodAliPayData;

/**
 * PaymentMethodBaseData
 * @typeParam T member of PaymentMethodTypes
 */
export interface PaymentMethodBaseData<T extends PaymentMethodTypes> {
  type: T;
  billingDetails?: BillingDetails;
}

/**
 * PaymentMethodCardData
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
 */
export interface PaymentMethodAliPayData
  extends PaymentMethodBaseData<'Alipay'> {}

/**
 * PaymentMethodTypes
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

/**
 * CardBrand
 */
export type CardBrand =
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
 */
export enum ConfirmPaymentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * CardActionError
 */
export enum CardActionError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * ConfirmSetupIntentError
 */
export enum ConfirmSetupIntentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * RetrievePaymentIntentError
 */
export enum RetrievePaymentIntentError {
  Canceled = 'Canceled',
}

/**
 * ApplePayError
 */

export enum ApplePayError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/**
 * CreatePaymentMethodError
 */
export enum CreatePaymentMethodError {
  Failed = 'Failed',
}

/**
 * StripeError
 * @typeParam T type of error code.
 */
export type StripeError<T> = {
  message: string;
  code: T;
};

/**
 * @ignore
 */
export type ApplePayButtonNativeProps = {
  style?: StyleProp<ViewStyle>;
  type?: number;
  buttonStyle?: number;
  onPressAction(): void;
};

/**
 * ShippingMethodType
 */
export type ShippingMethodType = 'final' | 'pending';

/**
 * ContactFieldsType
 */
export type ContactFieldsType =
  | 'emailAddress'
  | 'name'
  | 'phoneNumber'
  | 'phoneticName'
  | 'postalAddress';

/**
 * ShippingMethod
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
 */
export type ApplePayButtonStyle =
  | 'white'
  | 'whiteOutline'
  | 'black'
  | 'automatic';

/**
 * CartSummaryItem
 */
export type CartSummaryItem = {
  label: string;
  amount: string;
};

/**
 * AppInfo
 */
export type AppInfo = Partial<{
  name: string;
  partnerId: string;
  url: string;
  version: string;
}>;
