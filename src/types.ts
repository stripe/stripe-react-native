import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type Dictionary<T> = {
  [key: string]: T;
};

export type Nullable<T> = T | null;

export type CardDetails = {
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  postalCode?: string;
  brand: CardBrand;
  complete: boolean;
};

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

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocusChange(
    event: NativeSyntheticEvent<{ focusedField: Nullable<FocusFieldNames> }>
  ): void;
};

export type FocusFieldNames =
  | 'CardNumber'
  | 'Cvc'
  | 'ExpiryDate'
  | 'PostalCode';

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

type Address = {
  city: string;
  county: string;
  line1: string;
  line2: string;
  postalCode: string;
  state: string;
};

type ShippingDetails = {
  address: Address;
  name: string;
  carrier: string;
  phone: string;
  trackingNumber: string;
};

export type PaymentIntent = {
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
};

type LastPaymentError = StripeError<string> & {
  paymentMethod: PaymentMethod;
  type: PaymentIntentLastPaymentErrorType;
};

type PaymentIntentLastPaymentErrorType =
  | 'ApiConnection'
  | 'Api'
  | 'Authentication'
  | 'Card'
  | 'Idempotency'
  | 'InvalidRequest'
  | 'RateLimit'
  | 'Unknown';

type SetupIntentUsage =
  | 'Unknown'
  | 'None'
  | 'OnSession'
  | 'OffSession'
  | 'OneTime';

export type SetupIntent = {
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
};

export enum NavigationBarStyle {
  default = 0,
  black = 1,
  blackTranslucent = 2,
}

type NavigationBarPropsIOS = Partial<{
  barStyle: NavigationBarStyle;
  translucent: boolean;
  barTintColor: string;
}>;

type NavigationBarPropsAndroid = Partial<{
  statusBarColor: string;
  backgroundColor: string;
}>;

type NavigationBarProps = NavigationBarPropsAndroid &
  NavigationBarPropsIOS &
  Partial<{
    headerText: string;
    buttonText: string;
    textColor: string;
    textFontSize: number;
  }>;

type ThreeDsFooterProps = Partial<{
  backgroundColor: string;
  chevronColor: string;
  headingTextColor: string;
  textColor: string;
}>;

type ThreeDSecureMainPropsIOS = Partial<{
  backgroundColor: string;
  footer: ThreeDsFooterProps;
}>;

type ThreeDSecureMainPropsAndroid = Partial<{
  accentColor: string;
}>;

type ThreeDSecureMainProps = ThreeDSecureMainPropsIOS &
  ThreeDSecureMainPropsAndroid;

type ThreeDsLabelProps = Partial<{
  headingTextColor: string;
  textColor: string;
  textFontSize: number;
  headingFontSize: number;
}>;

type ThreeDSecureTextFieldProps = Partial<{
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  textColor: string;
  textFontSize: number;
}>;

type ThreeDSecureSubmitButtonProps = Partial<{
  backgroundColor: string;
  cornerRadius: number;
  textColor: string;
  textFontSize: number;
}>;

export type ThreeDSecureConfigurationParams = ThreeDSecureMainProps &
  Partial<{
    timeout: number;
    label: ThreeDsLabelProps;
    navigationBar: NavigationBarProps;
    textField: ThreeDSecureTextFieldProps;
    submitButton: ThreeDSecureSubmitButtonProps;
  }>;

export interface PaymentMethodOptions {}

export type PaymentMethodData = PaymentMethodCardData | PaymentMethodAliPayData;

export interface PaymentMethodBaseData<T extends PaymentMethodTypes = 'Card'> {
  type: T;
  billingDetails?: BillingDetails;
}

export type PaymentIntentFutureUsage = 'OffSession' | 'OnSession';

export type PaymentMethodCardData =
  | (PaymentMethodBaseData<'Card'> & {
      setupFutureUsage?: PaymentIntentFutureUsage;
      cardDetails: CardDetails;
    })
  | (PaymentMethodBaseData<'Card'> & {
      paymentMethodId: string;
      cvc?: string;
    });

export interface PaymentMethodAliPayData
  extends PaymentMethodBaseData<'Alipay'> {}

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

export enum ConfirmPaymentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum CardActionError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum ConfirmSetupIntentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum RetrievePaymentIntentError {
  Canceled = 'Canceled',
}

export enum ApplePayError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum CreatePaymentMethodError {
  Failed = 'Failed',
}

export type StripeError<T> = {
  message: string;
  code: T;
};

export type ApplePayButtonProps = {
  style?: StyleProp<ViewStyle>;
  type?: number;
  buttonStyle?: number;
  onPressAction(): void;
};

type ShippingMethodType = 'final' | 'pending';

type ContactFieldsType =
  | 'emailAddress'
  | 'name'
  | 'phoneNumber'
  | 'phoneticName'
  | 'postalAddress';

interface ShippingMethod {
  label: string;
  amount: string;
  type?: ShippingMethodType;
  identifier: string;
  detail?: string;
}

export interface PresentApplePayParams {
  cartItems: CartSummaryItem[];
  country: string;
  currency: string;
  requiredShippingAddressFields?: ContactFieldsType[];
  requiredBillingContactFields?: ContactFieldsType[];
  shippingMethods?: ShippingMethod[];
}

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

export type ApplePayButtonStyle =
  | 'white'
  | 'whiteOutline'
  | 'black'
  | 'automatic';

export type CartSummaryItem = {
  label: string;
  amount: string;
};

export type AppInfo = Partial<{
  name: string;
  partnerId: string;
  url: string;
  version: string;
}>;
