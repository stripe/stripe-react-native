import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export type Dictionary<T> = {
  [key: string]: T;
};

export type CardDetails = {
  cardNumber: string;
  cvc: string;
  expiryMonth: number;
  expiryYear: number;
};

export type CardFieldProps = {
  style?: StyleProp<ViewStyle>;
  value?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange(event: NativeSyntheticEvent<CardDetails>): void;
  onFocus(event: NativeSyntheticEvent<{ focusField: string }>): void;
};

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

export type ThreeDSecureConfigurationParams = {
  bodyFontSize?: number;
  bodyTextColor?: string;
  headingFontSize?: number;
  headingTextColor?: string;
  timeout?: number;
};

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

export enum CreatePaymentMethodError {
  Failed = 'Failed',
}

export type StripeError<T> = {
  message: string;
  code: T;
};

export type ApplePayButtonProps = {
  style?: StyleProp<ViewStyle>;
  onPay(): void;
};

export type CartSummaryItem = {
  label: string;
  amount: string;
};
