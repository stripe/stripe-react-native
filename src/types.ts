import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type Dictionary<T> = {
  [key: string]: T;
};

export type Nullable<T> = T | null;

export type CardDetails = {
  number: string;
  cvc: string;
  expiryMonth: number;
  expiryYear: number;
  postalCode?: string;
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

export type Intent = {
  id: string;
  amount: number;
  created: string;
  currency: string;
  status: IntentStatus;
  stripeId: string;
  description?: string;
  receiptEmail?: string;
};

export type SetupIntent = {
  id: string;
  created: string;
  status: IntentStatus;
  description?: string;
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

type ThreeDSecureFooterProps = Partial<{
  backgroundColor: string;
  chevronColor: string;
  headingTextColor: string;
  textColor: string;
}>;

type ThreeDSecureMainPropsIOS = Partial<{
  backgroundColor: string;
  footer: ThreeDSecureFooterProps;
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

export type PaymentMethod = {
  stripeId: string;
};

export enum ConfirmPaymentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum NextPaymentActionError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum ConfirmSetupIntentError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum PresentApplePayError {
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
  onPay(): void;
};

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
  version: string;
  url: string;
}>;
