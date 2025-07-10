import type { StripeError } from '.';
import type { Address, BillingDetails } from './Common';
import type { Result as PaymentMethodResult } from './PaymentMethod';
import type { NextAction } from './NextAction';
import type * as PaymentMethod from './PaymentMethod';
import type { FormDetails } from './components/AuBECSDebitFormComponent';
import type { BankAcccountHolderType, BankAcccountType } from './Token';
export interface Result {
  id: string;
  amount: number;
  /** The UNIX timestamp (in milliseconds) of the date this PaymentIntent was created. */
  created: string;
  currency: string;
  status: Status;
  description: string | null;
  receiptEmail: string | null;
  canceledAt: string | null;
  clientSecret: string;
  livemode: boolean;
  /** @deprecated Use paymentMethod.id instead. */
  paymentMethodId: string;
  paymentMethod: PaymentMethodResult | null;
  captureMethod: CaptureMethod;
  confirmationMethod: CaptureMethod;
  lastPaymentError: LastPaymentError | null;
  shipping: ShippingDetails | null;
  nextAction: NextAction | null;
}

export type CaptureMethod = 'Automatic' | 'Manual';

export type ConfirmParams =
  | CardParams
  | IdealParams
  | OxxoParams
  | P24Params
  | AlipayParams
  | GiropayParams
  | SepaParams
  | EpsParams
  | AuBecsDebitParams
  | GrabPayParams
  | FPXParams
  | AfterpayClearpayParams
  | KlarnaParams
  // | WeChatPayParams
  | BancontactParams
  | USBankAccountParams
  | PayPalParams
  | AffirmParams
  | CashAppParams
  | RevolutPayParams;

export type ConfirmOptions = PaymentMethod.ConfirmOptions;

export type LastPaymentError = StripeError<string> & {
  paymentMethod: PaymentMethodResult;
};

export type FutureUsage = 'OffSession' | 'OnSession' | 'None';

export interface ShippingDetails {
  address: Required<Address>;
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

export type MandateData = {
  customerAcceptance: {
    online: {
      ipAddress: string;
      userAgent: string;
    };
  };
};

type MetaData = {
  [key: string]: string;
};

export type CardParams =
  | {
      paymentMethodType: 'Card';
      paymentMethodData?: {
        token?: string;
        billingDetails?: BillingDetails;
        mandateData?: MandateData;
        metadata?: MetaData;
      };
    }
  | {
      paymentMethodType: 'Card';
      paymentMethodData: {
        paymentMethodId: string;
        cvc?: string;
        billingDetails?: BillingDetails;
        mandateData?: MandateData;
        metadata?: MetaData;
      };
    };

export interface IdealParams {
  paymentMethodType: 'Ideal';
  paymentMethodData?: {
    bankName?: string;
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface FPXParams {
  paymentMethodType: 'Fpx';
  paymentMethodData?: {
    testOfflineBank?: boolean;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface AlipayParams {
  paymentMethodType: 'Alipay';
  paymentMethodData?: {
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface OxxoParams {
  paymentMethodType: 'Oxxo';
  paymentMethodData: {
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface GrabPayParams {
  paymentMethodType: 'GrabPay';
  paymentMethodData?: {
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface BancontactParams {
  paymentMethodType: 'Bancontact';
  paymentMethodData: {
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface SepaParams {
  paymentMethodType: 'SepaDebit';
  paymentMethodData: {
    iban: string;
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface GiropayParams {
  paymentMethodType: 'Giropay';
  paymentMethodData: {
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface AfterpayClearpayParams {
  paymentMethodType: 'AfterpayClearpay';
  paymentMethodData: {
    shippingDetails: BillingDetails;
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export type KlarnaParams = {
  paymentMethodType: 'Klarna';
  paymentMethodData: {
    billingDetails: Pick<Required<BillingDetails>, 'email'> & {
      address: Pick<Required<Address>, 'country'>;
    } & BillingDetails;
    shippingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

export interface EpsParams {
  paymentMethodType: 'Eps';
  paymentMethodData: {
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface P24Params {
  paymentMethodType: 'P24';
  paymentMethodData: {
    billingDetails: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface WeChatPayParams {
  paymentMethodType: 'WeChatPay';
  paymentMethodData: {
    appId: string;
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
}

export interface AuBecsDebitParams {
  paymentMethodType: 'AuBecsDebit';
  paymentMethodData: { formDetails: FormDetails; mandateData?: MandateData };
}

export type AffirmParams = {
  paymentMethodType: 'Affirm';
  paymentMethodData?: {
    /** Affirm requires that shipping is present for the payment to succeed because it significantly helps with loan approval rates. Shipping details can either be provided here or via the Payment Intent- https://stripe.com/docs/api/payment_intents/create#create_payment_intent-shipping. */
    shippingDetails?: BillingDetails;
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

/**
 * If paymentMethodData is null, it is assumed that the bank account details have already been attached
 * via `collectBankAccountForPayment` or `collectBankAccountForSetup`.
 */
export type USBankAccountParams = {
  paymentMethodType: 'USBankAccount';
  paymentMethodData?: {
    billingDetails: Pick<Required<BillingDetails>, 'name'> & BillingDetails;
    accountNumber: string;
    routingNumber: string;
    /** Defaults to Individual */
    accountHolderType?: BankAcccountHolderType;
    /** Defaults to Checking */
    accountType?: BankAcccountType;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

export type PayPalParams = {
  paymentMethodType: 'PayPal';
  paymentMethodData?: {
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

export type CashAppParams = {
  paymentMethodType: 'CashApp';
  paymentMethodData?: {
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

export type RevolutPayParams = {
  paymentMethodType: 'RevolutPay';
  paymentMethodData?: {
    billingDetails?: BillingDetails;
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};

export type CollectBankAccountParams = {
  paymentMethodType: 'USBankAccount';
  paymentMethodData: {
    billingDetails: {
      name: string;
      email?: string;
    };
    mandateData?: MandateData;
    metadata?: MetaData;
  };
};
