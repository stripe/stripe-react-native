import type {
  Type,
  Card,
  BankAcccountHolderType,
  BankAccountStatus,
} from './Token';
import type { StripeError } from './Errors';

export type SheetResult =
  | {
      session: Session;
      error?: undefined;
    }
  | {
      session?: undefined;
      error: StripeError<FinancialConnectionsSheetError>;
    };

export type Session = {
  id: string;
  clientSecret: string;
  livemode: boolean;
  bankAccountToken: BankAccountToken;
  accounts: Array<Account>;
};

export type BankAccountToken = {
  bankAccount: BankAccount | null;
  livemode: boolean;
  id: string | null;
  used: boolean;
  type: Type | null;
  created: number | null;
  card: Card | null;
};

export type Account = {
  id: string;
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

export type BankAccount = {
  id: string;
  accountHolderName: string | null;
  accountHolderType: BankAcccountHolderType | null;
  bankName: string | null;
  country: string;
  currency: string;
  fingerprint: string | null;
  last4: string;
  routingNumber: string | null;
  status: BankAccountStatus;
};

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
