import type { FormDetails } from './components/AuBECSDebitFormComponent';
import type {
  CardBrand,
  BankAcccountHolderType,
  BankAcccountType,
} from './Token';
import type { FutureUsage } from './PaymentIntent';
import type { Address, BillingDetails } from './Common';

export interface Result {
  id: string;
  liveMode: boolean;
  customerId: string;
  billingDetails: BillingDetails;
  type: Type;
  AuBecsDebit: AuBecsDebitResult;
  BacsDebit: BacsDebitResult;
  Card: CardResult;
  Fpx: FpxResult;
  Ideal: IdealResult;
  SepaDebit: SepaDebitResult;
  Sofort: SofortResult;
  Upi: UpiResult;
}

export type CreateParams =
  | CardParams
  | IdealParams
  | OxxoParams
  | P24Params
  | AlipayParams
  | GiropayParams
  | SepaParams
  | EpsParams
  | AuBecsDebitParams
  | SofortParams
  | GrabPayParams
  | FPXParams
  | AfterpayClearpayParams
  | KlarnaParams
  // | WeChatPayParams
  | BancontactParams
  | USBankAccountParams;

export type ConfirmParams = CreateParams;

export type CreateOptions = {};

export type ConfirmOptions = CreateOptions;

export type ShippingDetails = BillingDetails;

interface BaseParams {
  billingDetails?: BillingDetails;
}

export type CardParams =
  | (BaseParams & {
      type: 'Card';
      token?: string;
      setupFutureUsage?: FutureUsage;
    })
  | (BaseParams & {
      type: 'Card';
      paymentMethodId: string;
      cvc?: string;
    });

export interface IdealParams extends BaseParams {
  type: 'Ideal';
  bankName?: string;
  setupFutureUsage?: FutureUsage;
}

export interface FPXParams {
  type: 'Fpx';
  testOfflineBank?: boolean;
}

export interface AlipayParams {
  type: 'Alipay';
}

export interface OxxoParams extends Required<BaseParams> {
  type: 'Oxxo';
}

export interface SofortParams extends BaseParams {
  type: 'Sofort';
  country: string;
  setupFutureUsage?: FutureUsage;
}
export interface GrabPayParams extends BaseParams {
  type: 'GrabPay';
}

export interface BancontactParams extends Required<BaseParams> {
  type: 'Bancontact';
  setupFutureUsage?: FutureUsage;
}

export interface SepaParams extends Required<BaseParams> {
  type: 'SepaDebit';
  iban: string;
  setupFutureUsage?: FutureUsage;
}

export interface GiropayParams extends Required<BaseParams> {
  type: 'Giropay';
}

export interface AfterpayClearpayParams extends Required<BaseParams> {
  type: 'AfterpayClearpay';
  shippingDetails: ShippingDetails;
}

export type KlarnaParams = {
  type: 'Klarna';
  billingDetails: Pick<Required<BillingDetails>, 'email'> & {
    address: Pick<Required<Address>, 'country'>;
  } & BillingDetails;
};

export interface EpsParams extends Required<BaseParams> {
  type: 'Eps';
}

export interface P24Params extends Required<BaseParams> {
  type: 'P24';
}

export interface WeChatPayParams extends BaseParams {
  type: 'WeChatPay';
  appId: string;
}

export interface AuBecsDebitParams {
  type: 'AuBecsDebit';
  formDetails: FormDetails;
}

/** Before using this payment method type, ensure you have already collected the bank information
 * for this intent with `collectBankAccountForPayment`. Otherwise, you will need to pass in the bank account
 * details manually.*/
export type USBankAccountParams = {
  type: 'USBankAccount';
  billingDetails?: Pick<Required<BillingDetails>, 'name'> & BillingDetails;
  accountNumber?: string;
  routingNumber?: string;
  /** Defaults to Individual */
  accountHolderType?: BankAcccountHolderType;
  /** Defaults to Checking */
  accountType?: BankAcccountType;
  setupFutureUsage?: FutureUsage;
};

export interface AuBecsDebitResult {
  fingerprint?: string;
  last4?: string;
  bsbNumber?: string;
}

export interface BacsDebitResult {
  sortCode?: string;
  last4?: string;
  fingerprint?: string;
}

export interface CardResult {
  brand?: CardBrand;
  country?: string;
  expYear?: number;
  expMonth?: number;
  fingerprint?: string;
  funding?: string;
  last4?: string;
}

export interface FpxResult {
  bank?: string;
}

export interface IdealResult {
  bankIdentifierCode?: string;
  bank?: string;
}

export interface SepaDebitResult {
  bankCode?: string;
  country?: string;
  fingerprint?: string;
  last4?: string;
}

export interface SofortResult {
  country?: string;
}

export interface UpiResult {
  vpa?: string;
}

export type USBankAccountResult = {
  routingNumber?: string;
  accountHolderType?: BankAcccountHolderType;
  accountType?: BankAcccountType;
  last4?: string;
  bankName?: string;
  linkedAccount?: string;
  fingerprint?: string;
  preferredNetwork?: string;
  supportedNetworks?: string[];
};

export type Type =
  | 'AfterpayClearpay'
  | 'Card'
  | 'Alipay'
  | 'GrabPay'
  | 'Ideal'
  | 'Fpx'
  | 'CardPresent'
  | 'SepaDebit'
  | 'AuBecsDebit'
  | 'BacsDebit'
  | 'Giropay'
  | 'P24'
  | 'Eps'
  | 'Bancontact'
  | 'Oxxo'
  | 'Sofort'
  | 'Upi'
  | 'USBankAccount'
  | 'Unknown';

export type CollectBankAccountParams = {
  type: 'USBankAccount';
  billingDetails: {
    name: string;
    email?: string;
  };
};
