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

export enum CreateTokenError {
  Failed = 'Failed',
}

export enum RetrievePaymentIntentError {
  Unknown = 'Unknown',
}

export enum RetrieveSetupIntentError {
  Unknown = 'Unknown',
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

export type ErrorType =
  | 'api_connection_error'
  | 'api_error'
  | 'authentication_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error';

export interface StripeError<T> {
  code: T;
  message: string;
  localizedMessage?: string;
  declineCode?: string;
  stripeErrorCode?: string;
  type?: ErrorType;
}
