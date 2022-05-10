import type { Type } from './PaymentMethod';
import type { LastPaymentError } from './PaymentIntent';
import type { NextAction } from './NextAction';
import type * as PaymentMethod from './PaymentMethod';
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
  | PaymentMethod.CardParams
  | PaymentMethod.IdealParams
  | PaymentMethod.OxxoParams
  | PaymentMethod.P24Params
  | PaymentMethod.AlipayParams
  | PaymentMethod.GiropayParams
  | PaymentMethod.SepaParams
  | PaymentMethod.EpsParams
  | PaymentMethod.AuBecsDebitParams
  | PaymentMethod.SofortParams
  | PaymentMethod.GrabPayParams
  | PaymentMethod.FPXParams
  | PaymentMethod.AfterpayClearpayParams
  | PaymentMethod.KlarnaParams
  | PaymentMethod.BancontactParams
  | PaymentMethod.USBankAccountParams;
// TODO: Change the above back to PaymentMethod.CreateParams when PayPal is supported through SetupIntents

export type ConfirmOptions = {};

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
