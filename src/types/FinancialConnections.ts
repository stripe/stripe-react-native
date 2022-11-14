import type { BankAccount } from './Token';
import type { StripeError } from './Errors';

export type SessionResult =
  | {
      /** The updated Financial Connections Session object. */
      session: Session;
      error?: undefined;
    }
  | {
      session?: undefined;
      error: StripeError<FinancialConnectionsSheetError>;
    };

export type TokenResult =
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
  /** The UNIX timestamp (in milliseconds) of the date this token was created. */
  created: number | null;
};

export type Account = {
  /** A unique ID for this Financial Connections Account. */
  id: string;
  /** Has the value true if the object exists in live mode or the value false if the object exists in test mode. */
  livemode: boolean;
  displayName: string | null;
  /** The current status of the account. Either active, inactive, or disconnected. */
  status: AccountStatus;
  institutionName: string;
  last4: string | null;
  /** The UNIX timestamp (in milliseconds) of the date this account was created. */
  created: number;
  /** The balance of this account. */
  balance: Balance | null;
  /** The last balance refresh. Includes the timestamp and the status. */
  balanceRefresh: BalanceRefresh | null;
  /** The category of this account, either cash, credit, investment, or other. */
  category: Category;
  /** The subcategory of this account, either checking, credit_card, line_of_credit, mortgage, savings, or other. */
  subcategory: Subcategory;
  /** Permissions requested for accounts collected during this session. */
  permissions: Array<Permission> | null;
  /** The supported payment method types for this account. */
  supportedPaymentMethodTypes: Array<PaymentMethodType>;
};

export type AccountStatus = 'active' | 'inactive' | 'disconnected';

export type Category = 'cash' | 'credit' | 'investment' | 'other';

export type PaymentMethodType = 'us_bank_account' | 'link';

export type Subcategory =
  | 'checking'
  | 'creditCard'
  | 'lineOfCredit'
  | 'mortgage'
  | 'other'
  | 'savings';

export type Permission =
  | 'balances'
  | 'ownership'
  | 'paymentMethod'
  | 'transactions'
  | 'accountNumbers';

export type Balance = {
  /** The UNIX timestamp (in milliseconds) of time that the external institution calculated this balance. */
  asOf: number;
  /** The type of this balance, either cash or credit. */
  type: BalanceType;
  /** The funds available to the account holder. Typically this is the current balance less any holds.  Each key is a three-letter [ISO currency code](https://www.iso.org/iso-4217-currency-codes.html), in lowercase.  Each value is an integer amount. A positive amount indicates money owed to the account holder. A negative amount indicates money owed by the account holder. */
  cash: { available: Map<String, number> | null };
  /** The credit that has been used by the account holder.  Each key is a three-letter [ISO currency code](https://www.iso.org/iso-4217-currency-codes.html), in lowercase.  Each value is a integer amount. A positive amount indicates money owed to the account holder. A negative amount indicates money owed by the account holder. */
  credit: { used: Map<String, number> | null };
  /** The balances owed to (or by) the account holder.  Each key is a three-letter [ISO currency code](https://www.iso.org/iso-4217-currency-codes.html), in lowercase.  Each value is a integer amount. A positive amount indicates money owed to the account holder. A negative amount indicates money owed by the account holder. */
  current: Map<String, number>;
};

export type BalanceRefresh = {
  status: BalanceRefreshStatus;
  /** The UNIX timestamp (in milliseconds) of the time at which the last refresh attempt was initiated. */
  lastAttemptedAt: number;
};

export type BalanceType = 'cash' | 'credit';

export type BalanceRefreshStatus = 'failed' | 'pending' | 'succeeded';

export enum FinancialConnectionsSheetError {
  Failed = 'Failed',
  Canceled = 'Canceled',
}
