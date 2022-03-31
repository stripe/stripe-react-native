import type { AuBECSDebitFormComponent } from './components/AuBECSDebitForm';
import type { Card } from './Card';
import type { PaymentIntents } from './PaymentIntents';
import type { BankAcccountHolderType, BankAcccountType } from './index';
export interface PaymentMethod {
  id: string;
  liveMode: boolean;
  customerId: string;
  billingDetails: PaymentMethods.BillingDetails;
  type: PaymentMethods.Types;
  AuBecsDebit: PaymentMethods.AuBecsDebit;
  BacsDebit: PaymentMethods.BacsDebit;
  Card: PaymentMethods.Card;
  Fpx: PaymentMethods.Fpx;
  Ideal: PaymentMethods.Ideal;
  SepaDebit: PaymentMethods.SepaDebit;
  Sofort: PaymentMethods.Sofort;
  Upi: PaymentMethods.Upi;
}

export namespace PaymentMethodCreateParams {
  export type Params =
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

  export type BillingDetails = {
    email?: string;
    name?: string;
    phone?: string;
    addressPostalCode?: string;
    addressCity?: string;
    addressCountry?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressState?: string;
  };

  export type ShippingDetails = {
    addressPostalCode?: string;
    addressCity?: string;
    addressCountry?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressState?: string;
    name?: string;
  };

  export interface Options {}

  export interface BaseParams {
    billingDetails?: BillingDetails;
  }

  export type CardParams =
    | (BaseParams & {
        type: 'Card';
        token?: string;
        setupFutureUsage?: PaymentIntents.FutureUsage;
      })
    | (BaseParams & {
        type: 'Card';
        paymentMethodId: string;
        cvc?: string;
      });

  export interface IdealParams extends BaseParams {
    type: 'Ideal';
    bankName?: string;
    setupFutureUsage?: PaymentIntents.FutureUsage;
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
    setupFutureUsage?: PaymentIntents.FutureUsage;
  }
  export interface GrabPayParams extends BaseParams {
    type: 'GrabPay';
  }

  export interface BancontactParams extends Required<BaseParams> {
    type: 'Bancontact';
    setupFutureUsage?: PaymentIntents.FutureUsage;
  }

  export interface SepaParams extends Required<BaseParams> {
    type: 'SepaDebit';
    iban: string;
    setupFutureUsage?: PaymentIntents.FutureUsage;
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
    billingDetails: Pick<Required<BillingDetails>, 'email' | 'addressCountry'> &
      BillingDetails;
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
    formDetails: AuBECSDebitFormComponent.FormDetails;
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
    setupFutureUsage?: PaymentIntents.FutureUsage;
  };
}

export declare namespace PaymentMethods {
  export interface BillingDetails {
    email?: string;
    phone?: string;
    name?: string;
    address?: Address;
  }

  export interface Address {
    city: string;
    county: string;
    line1: string;
    line2: string;
    postalCode: string;
    state: string;
  }

  export interface AuBecsDebit {
    fingerprint?: string;
    last4?: string;
    bsbNumber?: string;
  }

  export interface BacsDebit {
    sortCode?: string;
    last4?: string;
    fingerprint?: string;
  }

  export interface Card {
    brand?: Card.Brand;
    country?: string;
    expYear?: number;
    expMonth?: number;
    fingerprint?: string;
    funding?: string;
    last4?: string;
  }

  export interface Fpx {
    bank?: string;
  }

  export interface Ideal {
    bankIdentifierCode?: string;
    bank?: string;
  }

  export interface SepaDebit {
    bankCode?: string;
    country?: string;
    fingerprint?: string;
    last4?: string;
  }

  export interface Sofort {
    country?: string;
  }

  export interface Upi {
    vpa?: string;
  }

  export type USBankAccount = {
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

  export type Types =
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
}
