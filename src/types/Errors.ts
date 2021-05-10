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

export enum PaymentSheetError {
  Failed = 'Failed',
  Canceled = 'Canceled',
}

export interface StripeError<T> {
  message: string;
  code: T;
}
