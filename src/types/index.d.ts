/// <reference path="./PaymentMethods.d.ts" />
/// <reference path="./PaymentIntents.d.ts" />
/// <reference path="./SetupIntents.d.ts" />

declare module '@stripe/stripe-react-native' {
  export type Dictionary<T> = {
    [key: string]: T;
  };

  export type Nullable<T> = T | null;

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
}
