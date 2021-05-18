export namespace Card {
  export type Brand =
    | 'AmericanExpress'
    | 'DinersClub'
    | 'Discover'
    | 'JCB'
    | 'MasterCard'
    | 'UnionPay'
    | 'Visa'
    | 'Unknown';

  export type TokenType =
    | 'Account'
    | 'BankAccount'
    | 'Card'
    | 'CvcUpdate'
    | 'Person'
    | 'Pii';

  export interface Token {
    id: string;
    created: number;
    type: TokenType;
    used: boolean;
    livemode: boolean;
    card?: Params;
    bankAccount?: BankAccount;
  }

  export interface BankAccount {
    bankName: string;
    accountHolderName: string;
    accountHolderType: 'Individual' | 'Company';
    currency: string;
    country: string;
    routingNumber: string;
    status: 'Errored' | 'New' | 'Validated' | 'VerificationFailed' | 'Verified';
  }

  export interface Params {
    country: string;
    brand: Card.Brand;
    currency: string;
    expMonth: number;
    expYear: number;
    last4: string;
    funding: 'Credit' | 'Debit' | 'Prepaid' | 'Unknown';
    address: Address;
  }

  export interface Address {
    addressCity: 'Houston';
    addressCountry: 'US';
    addressLine1: '1459  Circle Drive';
    addressLine2: 'Texas';
    addressPostalCode: '77063';
  }

  export interface CreateTokenParams {
    type: 'Card' | 'BankAccount' | 'PII' | 'Person';
    address?: Address;
  }
}
