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
  /** The UNIX timestamp (in milliseconds) of the date this token was created. */
  created: string;
  type: Type;
  used: boolean;
  livemode: boolean;
  card?: Card;
  bankAccount?: BankAccount;
}

export interface BankAccount {
  /** A unique ID for this bank account. */
  id: string;
  /** The name of the associated bank. */
  bankName: string | null;
  /** The name of the person or business that owns the bank account. This field is required when attaching the bank account to a Customer object. */
  accountHolderName: string | null;
  /** The type of entity that holds the account. */
  accountHolderType: BankAcccountHolderType | null;
  /** The currency the bank account is in. This must be a country/currency pairing that Stripe supports. */
  currency: string | null;
  /** The country in which the bank account is located. */
  country: string | null;
  routingNumber: string | null;
  status: BankAccountStatus | null;
  fingerprint: string | null;
  last4: string | null;
}

export type BankAccountStatus =
  | 'Errored'
  | 'New'
  | 'Validated'
  | 'VerificationFailed'
  | 'Verified';

export interface Card {
  id: string;
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

export type CreateParams =
  | CreateCardTokenParams
  | CreateBankAccountTokenParams
  | CreatePiiTokenParams;

/** Creates a single-use token that represents a credit card’s details. Use this in combination with either the CardField or CardForm components. This token can be used in place of a credit card object with any API method. See https://stripe.com/docs/api/tokens/create_card*/
export type CreateCardTokenParams = {
  type: 'Card';
  address?: Address;
  name?: string;
  currency?: string;
};

export type BankAcccountHolderType = 'Company' | 'Individual';

export type BankAcccountType = 'Checking' | 'Savings';

/** Creates a single-use token that represents a bank account’s details. This token can be used with any API method in place of a bank account object. See https://stripe.com/docs/api/tokens/create_bank_account */
export type CreateBankAccountTokenParams = {
  type: 'BankAccount';
  accountHolderName?: string;
  accountHolderType?: BankAcccountHolderType;
  accountNumber: string;
  country: string;
  currency: string;
  routingNumber?: string;
};

/** Creates a single-use token that represents the details of personally identifiable information (PII). See https://stripe.com/docs/api/tokens/create_pii */
export type CreatePiiTokenParams = {
  type: 'Pii';
  /** The user's personal ID number */
  personalId: string;
};
