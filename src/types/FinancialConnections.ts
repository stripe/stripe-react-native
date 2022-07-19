import type { BankAccount } from './Token';
import type { StripeError } from './Errors';

export type SheetResult =
  | {
      /** The updated Financial Connections Session object. */
      session: Session;
      /** The Stripe token object associated with the bank account. */
      token: BankAccountToken;
      error?: undefined;
    }
  | {
      session?: undefined;
      token?: undefined;
      error: StripeError<FinancialConnectionsSheetError>;
    };

export type Session = {
  /** A unique ID for this session. */
  id: string;
  /** The client secret for this session. */
  clientSecret: string;
  /** Has the value true if the object exists in live mode or the value false if the object exists in test mode. */
  livemode: boolean;
  /** The accounts that were collected as part of this Session. */
  accounts: Array<Account>;
};

export type BankAccountToken = {
  /** Bank account details. */
  bankAccount: BankAccount | null;
  /** Has the value true if the object exists in live mode or the value false if the object exists in test mode. */
  livemode: boolean;
  /** A unique ID for this token. */
  id: string | null;
  used: boolean;
  type: 'BankAccount';
  created: number | null;
};

export type Account = {
  /** A unique ID for this Financial Connections Account. */
  id: string;
  /** Has the value true if the object exists in live mode or the value false if the object exists in test mode. */
  livemode: boolean;
  displayName: string | null;
  status: 'active' | 'inactive' | 'disconnected';
  institutionName: string;
  last4: string | null;
  created: number;
  balance: Balance | null;
  balanceRefresh: BalanceRefresh | null;
  category: 'cash' | 'credit' | 'investment' | 'other';
  subcategory: Subcategory;
  /** Permissions requested for accounts collected during this session. */
  permissions: Array<Permission> | null;
  supportedPaymentMethodTypes: 'us_bank_account' | 'link';
};

export type Subcategory =
  | 'checking'
  | 'credit_card'
  | 'line_of_credit'
  | 'mortgage'
  | 'other'
  | 'savings';

export type Permission =
  | 'balances'
  | 'ownership'
  | 'payment_method'
  | 'transactions'
  | 'account_numbers';

export type Balance = {
  asOf: number;
  type: 'cash' | 'credit';
  cash: Map<String, number> | null;
  credit: Map<String, number> | null;
  current: Map<String, number>;
};

export type BalanceRefresh = {
  status: 'failed' | 'pending' | 'succeeded';
  lastAttemptedAt: number;
};

export enum FinancialConnectionsSheetError {
  Failed = 'Failed',
  Canceled = 'Canceled',
}
