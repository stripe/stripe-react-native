import type { CardFieldInput } from './components/CardFieldInput';

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

export declare namespace CreatePaymentMethod {
  export type Params = CardParams | AlipayParams;

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

  export interface Options {}

  export interface BaseParams<T extends PaymentMethods.Types> {
    type: T;
    billingDetails: BillingDetails;
  }

  export type CardParams =
    | (BaseParams<'Card'> & {
        cardDetails: CardFieldInput.Details;
      })
    | (BaseParams<'Card'> & {
        paymentMethodId: string;
      });

  export interface AlipayParams extends BaseParams<'Alipay'> {}
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
    brand?: CardFieldInput.Brand;
    country?: string;
    expYear?: string;
    expMonth?: string;
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

  export type Types =
    | 'AfterpayClearpay'
    | 'Card'
    | 'Alipay'
    | 'Grabpay'
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
    | 'Unknown';
}
