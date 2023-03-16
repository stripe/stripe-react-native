import type { Type } from './PaymentMethod';
import type {
  LastPaymentError,
  ConfirmParams as PaymentIntentConfirmParams,
  ConfirmOptions as PaymentIntentConfirmOptions,
} from './PaymentIntent';
import type { NextAction } from './NextAction';
import type * as PaymentMethod from './PaymentMethod';
export interface Result {
  id: string;
  clientSecret: string;
  lastSetupError: LastPaymentError | null;
  /** The UNIX timestamp (in milliseconds) of the date this Setup Intent was created. */
  created: string | null;
  livemode: boolean;
  /** @deprecated Use paymentMethod.id instead. */
  paymentMethodId: string | null;
  paymentMethod: PaymentMethod.Result | null;
  status: Status;
  paymentMethodTypes: Type[];
  usage: FutureUsage;
  description: string | null;
  nextAction: NextAction | null;
}

export type ConfirmParams = PaymentIntentConfirmParams;

export type ConfirmOptions = PaymentIntentConfirmOptions;

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
