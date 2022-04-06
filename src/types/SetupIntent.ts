import type { FormDetails } from './components/AuBECSDebitFormComponent';
import type { Type, USBankAccountParams } from './PaymentMethod';
import type { BillingDetails } from './Common';
import type { LastPaymentError } from './PaymentIntent';
import type { NextAction } from './NextAction';
export interface Result {
  id: string;
  clientSecret: string;
  lastSetupError: LastPaymentError | null;
  created: string | null;
  livemode: boolean;
  paymentMethodId: string | null;
  status: Status;
  paymentMethodTypes: Type[];
  usage: FutureUsage;
  description: string | null;
  nextAction: NextAction | null;
}

export type ConfirmParams =
  | CardParams
  | IdealParams
  | BancontactParams
  | SofortParams
  | AuBecsDebitParams
  | SepaParams
  | USBankAccountParams;

export interface ConfirmOptions {}

export interface BaseParams {
  billingDetails?: BillingDetails;
}

export interface CardParams extends BaseParams {
  type: 'Card';
}

export interface IdealParams extends BaseParams {
  type: 'Ideal';
  bankName?: string;
}

export interface SofortParams extends BaseParams {
  type: 'Sofort';
  country: string;
}
export interface BancontactParams extends Required<BaseParams> {
  type: 'Bancontact';
}

export interface SepaParams extends Required<BaseParams> {
  type: 'SepaDebit';
  iban: string;
}

export interface AuBecsDebitParams {
  type: 'AuBecsDebit';
  formDetails: FormDetails;
}

export type FutureUsage =
  | 'Unknown'
  | 'None'
  | 'OnSession'
  | 'OffSession'
  | 'OneTime';

export enum Status {
  Succeeded = 'Succeeded',
  RequiresPaymentMethod = 'RequiresPaymentMethod',
  RequiresConfirmation = 'RequiresConfirmation',
  Canceled = 'Canceled',
  Processing = 'Processing',
  RequiresAction = 'RequiresAction',
  Unknown = 'Unknown',
}
