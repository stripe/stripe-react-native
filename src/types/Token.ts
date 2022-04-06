import type { Address } from './Common';

export type CardBrand =
  | 'AmericanExpress'
  | 'DinersClub'
  | 'Discover'
  | 'JCB'
  | 'MasterCard'
  | 'UnionPay'
  | 'Visa'
  | 'Unknown';

export type Type =
  | 'Account'
  | 'BankAccount'
  | 'Card'
  | 'CvcUpdate'
  | 'Person'
  | 'Pii';

export interface Result {
  id: string;
  created: string;
  type: Type;
  used: boolean;
  livemode: boolean;
  card?: Card;
  bankAccount?: BankAccount;
}

export interface BankAccount {
  bankName: string;
  accountHolderName: string;
  accountHolderType: BankAcccountHolderType;
  currency: string;
  country: string;
  routingNumber: string;
  status: 'Errored' | 'New' | 'Validated' | 'VerificationFailed' | 'Verified';
}

export interface Card {
  country: string;
  brand: CardBrand;
  currency?: string;
  expMonth: number;
  expYear: number;
  last4: string;
  funding: 'Credit' | 'Debit' | 'Prepaid' | 'Unknown';
  address: Address;
  name?: string;
}

export type CreateParams = CreateCardTokenParams | CreateBankAccountTokenParams;

export type CreateCardTokenParams = {
  type: 'Card';
  address?: Address;
  name?: string;
  currency?: string;
};

export type BankAcccountHolderType = 'Company' | 'Individual';

export type BankAcccountType = 'Checking' | 'Savings';

export type CreateBankAccountTokenParams = {
  type: 'BankAccount';
  accountHolderName?: string;
  accountHolderType?: BankAcccountHolderType;
  accountNumber: string;
  country: string;
  currency: string;
  routingNumber?: string;
};
