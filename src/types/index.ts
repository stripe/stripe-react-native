export * from './ApplePay';
export * from './PaymentIntents';
export * from './PaymentMethods';
export * from './SetupIntent';
export * from './ThreeDSecure';
export * from './components/ApplePayButtonComponent';
export * from './components/CardFieldInput';
/**
 * @ignore
 */
export type Dictionary<T> = {
  [key: string]: T;
};

/**
 * @ignore
 */
export type Nullable<T> = T | null;

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

export enum CreatePaymentMethodError {
  Failed = 'Failed',
}

export enum RetrievePaymentIntentError {
  Canceled = 'Canceled',
}

export enum ApplePayError {
  Canceled = 'Canceled',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export interface StripeError<T> {
  message: string;
  code: T;
}

export interface CartSummaryItem {
  label: string;
  amount: string;
}

export interface AppInfo {
  name?: string;
  partnerId?: string;
  url?: string;
  version?: string;
}
