import type { Nullable, StripeError } from '.';
import type { AuBECSDebitFormComponent } from './components/AuBECSDebitForm';
import type { PaymentMethod, PaymentMethods } from './PaymentMethods';

export interface SetupIntent {
  id: string;
  clientSecret: string;
  lastSetupError: Nullable<ConfirmSetupIntent.LastPaymentError>;
  created: Nullable<string>;
  livemode: boolean;
  paymentMethodId: Nullable<string>;
  status: SetupIntents.Status;
  paymentMethodTypes: PaymentMethods.Types[];
  usage: SetupIntents.FutureUsage;
  description: Nullable<string>;
}

export namespace ConfirmSetupIntent {
  export type LastPaymentError = StripeError<string> & {
    paymentMethod: PaymentMethod;
  };

  export type Params =
    | CardParams
    | IdealParams
    | BancontactParams
    | SofortParams
    | AuBecsDebitParams
    | SepaParams;

  export interface Options {}

  export interface BaseParams {
    billingDetails?: PaymentMethods.BillingDetails;
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
    formDetails: AuBECSDebitFormComponent.FormDetails;
  }
}

export namespace SetupIntents {
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
    RequiresCapture = 'RequiresCapture',
    Unknown = 'Unknown',
  }
}
