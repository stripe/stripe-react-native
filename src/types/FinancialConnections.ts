import type { UserInterfaceStyle } from './Common';
import type { BankAccount } from './Token';
import type { StripeError } from './Errors';

export type CollectFinancialConnectionsAccountsParams = {
  /** iOS Only. Style options for colors in Financial Connections. By default, the bank account collector will automatically switch between light and dark mode compatible colors based on device settings. */
  style?: UserInterfaceStyle;
  /** An optional event listener to receive @type {FinancialConnectionEvent} for specific events during the process of a user connecting their financial accounts. */
  onEvent?: (event: FinancialConnectionsEvent) => void;
};

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

export type FinancialConnectionsEvent = {
  /** The event's name. Represents the type of event that has occurred during the Financial Connections process. */
  name: FinancialConnectionsEventName;
  /** Event-associated metadata. Provides further detail related to the occurred event. */
  metadata: FinancialConnectionsEventMetadata;
};

export enum FinancialConnectionsEventName {
  /** Invoked when the sheet successfully opens. */
  Open = 'open',
  /** Invoked when the manual entry flow is initiated. */
  ManualEntryInitiated = 'manual_entry_initiated',
  /** Invoked when "Agree and continue" is selected on the consent pane. */
  ConsentAcquired = 'consent_acquired',
  /** Invoked when the search bar is selected, the user inputs search terms, and receives an API response. */
  SearchInitiated = 'search_initiated',
  /** Invoked when an institution is selected, either from featured institutions or search results. */
  InstitutionSelected = 'institution_selected',
  /** Invoked when the authorization is successfully completed. */
  InstitutionAuthorized = 'institution_authorized',
  /** Invoked when accounts are selected and "confirm" is selected. */
  AccountsSelected = 'accounts_selected',
  /** Invoked when the flow is completed and selected accounts are correctly connected to the payment instrument. */
  Success = 'success',
  /** Invoked when an error is encountered. Refer to error codes for more details. */
  Error = 'error',
  /** Invoked when the flow is cancelled, typically by the user pressing the "X" button. */
  Cancel = 'cancel',
  /** Invoked when the modal is launched in an external browser. After this event, no other events will be sent until the completion of the browser session. */
  FlowLaunchedInBrowser = 'flow_launched_in_browser',
}

export type FinancialConnectionsEventMetadata = {
  /** A Boolean value that indicates if the user completed the process through the manual entry flow. */
  manualEntry?: boolean;
  /** A String value containing the name of the institution that the user selected. */
  institutionName?: string;
  /** An ErrorCode value representing the type of error that occurred. */
  errorCode?: FinancialConnectionsEventErrorCode;
};

export enum FinancialConnectionsEventErrorCode {
  /** The system could not retrieve account numbers for selected accounts. */
  AccountNumbersUnavailable = 'account_numbers_unavailable',
  /** The system could not retrieve accounts for the selected institution. */
  AccountsUnavailable = 'accounts_unavailable',
  /** For payment flows, no debitable account was available at the selected institution. */
  NoDebitableAccount = 'no_debitable_account',
  /** Authorization with the selected institution has failed. */
  AuthorizationFailed = 'authorization_failed',
  /** The selected institution is down for expected maintenance. */
  InstitutionUnavailablePlanned = 'institution_unavailable_planned',
  /** The selected institution is unexpectedly down. */
  InstitutionUnavailableUnplanned = 'institution_unavailable_unplanned',
  /** A timeout occurred while communicating with our partner or downstream institutions. */
  InstitutionTimeout = 'institution_timeout',
  /** An unexpected error occurred, either in an API call or on the client-side. */
  UnexpectedError = 'unexpected_error',
  /** The client secret that powers the session has expired. */
  SessionExpired = 'session_expired',
  /** The hCaptcha challenge failed. */
  FailedBotDetection = 'failed_bot_detection',
}
