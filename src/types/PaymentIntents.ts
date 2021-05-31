import type { Nullable, StripeError } from '.';
import type { PaymentMethod } from './PaymentMethods';

export interface PaymentIntent {
  id: string;
  amount: number;
  created: string;
  currency: string;
  status: PaymentIntents.Status;
  description: Nullable<string>;
  receiptEmail: Nullable<string>;
  canceledAt: Nullable<string>;
  clientSecret: string;
  livemode: boolean;
  paymentMethodId: string;
  captureMethod: 'Automatic' | 'Manual';
  confirmationMethod: 'Automatic' | 'Manual';
  lastPaymentError: Nullable<PaymentIntents.LastPaymentError>;
  shipping: Nullable<PaymentIntents.ShippingDetails>;
}

export namespace PaymentIntents {
  export type LastPaymentError = StripeError<string> & {
    paymentMethod: PaymentMethod;
  };

  export interface Address {
    city: string;
    county: string;
    line1: string;
    line2: string;
    postalCode: string;
    state: string;
  }

  export type FutureUsage = 'OffSession' | 'OnSession';

  export interface ShippingDetails {
    address: Address;
    name: string;
    carrier: string;
    phone: string;
    trackingNumber: string;
  }

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
