import type { StripeError } from './Errors';

export type SheetResult =
  | {
      session: Session;
      error?: undefined;
    }
  | {
      session?: undefined;
      error: StripeError<FinancialConnectionsSheetError>;
    };

export type Session = {};

export enum FinancialConnectionsSheetError {
  Failed = 'Failed',
  Canceled = 'Canceled',
}
