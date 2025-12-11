import type {
  AmountFilterType,
  DateFilterType,
  FieldOption,
  FutureRequirements,
  OnboardingSettings,
  PaymentMethod,
  PaymentsFilterSettings,
  PaymentStatus,
  Requirements,
  ViewControllerSettings,
} from '../types';
import { APPEARANCE_PRESETS } from './appearancePresets';

export const DEFAULT_BACKEND_URL =
  'https://stripe-connect-mobile-example-v1.stripedemos.com/';

// Configuration objects for onboarding settings with labels
const FIELD_OPTIONS_CONFIG: Record<FieldOption | 'default', string> = {
  default: 'Default',
  currently_due: 'Currently Due',
  eventually_due: 'Eventually Due',
};

const FUTURE_REQUIREMENTS_CONFIG: Record<
  FutureRequirements | 'default',
  string
> = {
  default: 'Default',
  omit: 'Omit',
  include: 'Include',
};

const REQUIREMENTS_CONFIG: Record<Requirements | 'default', string> = {
  default: 'Default',
  only: 'Only',
  exclude: 'Exclude',
};

// Export field options as arrays with value and label
export const FIELD_OPTIONS = Object.entries(FIELD_OPTIONS_CONFIG).map(
  ([value, label]) => ({ value, label })
);

export const FUTURE_REQUIREMENTS_OPTIONS = Object.entries(
  FUTURE_REQUIREMENTS_CONFIG
).map(([value, label]) => ({ value, label }));

export const REQUIREMENTS_OPTIONS = Object.entries(REQUIREMENTS_CONFIG).map(
  ([value, label]) => ({ value, label })
);

export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = {
  fullTermsOfServiceUrl: '',
  recipientTermsOfServiceUrl: '',
  privacyPolicyUrl: '',
  skipTermsOfService: undefined,
  fieldOption: undefined,
  futureRequirements: undefined,
  requirements: undefined,
  requirementsList: '',
};

export const DEFAULT_PAYMENTS_FILTER_SETTINGS: PaymentsFilterSettings = {
  amountFilterType: undefined,
  dateFilterType: undefined,
  selectedStatuses: [],
  paymentMethod: undefined,
};

export const DEFAULT_VIEW_CONTROLLER_SETTINGS: ViewControllerSettings = {
  presentationType: 'navigation_push',
  embedInNavigationBar: false,
  embedInTabBar: false,
};

// Configuration object mapping payment status types to display labels
// TypeScript will error if a new PaymentStatus is added to the SDK but not handled here
const PAYMENT_STATUSES_CONFIG: Record<PaymentStatus, string> = {
  blocked: 'Blocked',
  canceled: 'Canceled',
  disputed: 'Disputed',
  early_fraud_warning: 'Early Fraud Warning',
  failed: 'Failed',
  incomplete: 'Incomplete',
  partially_refunded: 'Partially Refunded',
  pending: 'Pending',
  refund_pending: 'Refund Pending',
  refunded: 'Refunded',
  successful: 'Successful',
  uncaptured: 'Uncaptured',
};

// Export the payment statuses as an array of objects with value and label
export const PAYMENT_STATUSES = Object.entries(PAYMENT_STATUSES_CONFIG).map(
  ([value, label]) => ({ value: value as PaymentStatus, label })
);

export const AMOUNT_FILTER_TYPES: Array<{
  value: AmountFilterType;
  label: string;
}> = [
  { value: 'equals', label: 'Equals' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
];

export const DATE_FILTER_TYPES: Array<{
  value: DateFilterType;
  label: string;
}> = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

// Configuration object mapping payment method types to display labels
// TypeScript will error if a new PaymentMethod is added to the SDK but not handled here
const PAYMENT_METHODS_CONFIG: Record<
  NonNullable<PaymentMethod> | 'none',
  string
> = {
  none: 'None',
  ach_credit_transfer: 'Ach Credit Transfer',
  ach_debit: 'Ach Debit',
  acss_debit: 'Acss Debit',
  affirm: 'Affirm',
  afterpay_clearpay: 'Afterpay Clearpay',
  alipay: 'Alipay',
  alma: 'Alma',
  amazon_pay: 'Amazon Pay',
  amex_express_checkout: 'Amex Express Checkout',
  android_pay: 'Android Pay',
  apple_pay: 'Apple Pay',
  au_becs_debit: 'Au Becs Debit',
  nz_bank_account: 'NZ Bank Account',
  bancontact: 'Bancontact',
  bacs_debit: 'Bacs Debit',
  bitcoin_source: 'Bitcoin Source',
  bitcoin: 'Bitcoin',
  blik: 'Blik',
  boleto: 'Boleto',
  boleto_pilot: 'Boleto Pilot',
  card_present: 'Card Present',
  card: 'Card',
  cashapp: 'Cash App',
  crypto: 'Crypto',
  customer_balance: 'Customer Balance',
  demo_pay: 'Demo Pay',
  dummy_passthrough_card: 'Dummy Passthrough Card',
  gbp_credit_transfer: 'GBP Credit Transfer',
  google_pay: 'Google Pay',
  eps: 'EPS',
  fpx: 'FPX',
  giropay: 'Giropay',
  grabpay: 'GrabPay',
  ideal: 'iDEAL',
  id_bank_transfer: 'ID Bank Transfer',
  id_credit_transfer: 'ID Credit Transfer',
  jp_credit_transfer: 'JP Credit Transfer',
  interac_present: 'Interac Present',
  kakao_pay: 'Kakao Pay',
  klarna: 'Klarna',
  konbini: 'Konbini',
  kr_card: 'KR Card',
  kr_market: 'KR Market',
  link: 'Link',
  masterpass: 'Masterpass',
  mb_way: 'MB Way',
  meta_pay: 'Meta Pay',
  multibanco: 'Multibanco',
  mobilepay: 'MobilePay',
  naver_pay: 'Naver Pay',
  netbanking: 'Netbanking',
  ng_bank: 'NG Bank',
  ng_bank_transfer: 'NG Bank Transfer',
  ng_card: 'NG Card',
  ng_market: 'NG Market',
  ng_ussd: 'NG USSD',
  vipps: 'Vipps',
  oxxo: 'OXXO',
  p24: 'Przelewy24',
  payto: 'PayTo',
  pay_by_bank: 'Pay By Bank',
  paper_check: 'Paper Check',
  payco: 'Payco',
  paynow: 'PayNow',
  paypal: 'PayPal',
  pix: 'Pix',
  promptpay: 'PromptPay',
  revolut_pay: 'Revolut Pay',
  samsung_pay: 'Samsung Pay',
  sepa_credit_transfer: 'SEPA Credit Transfer',
  sepa_debit: 'SEPA Debit',
  sofort: 'Sofort',
  south_korea_market: 'South Korea Market',
  swish: 'Swish',
  three_d_secure: '3D Secure',
  three_d_secure_2: '3D Secure 2',
  three_d_secure_2_eap: '3D Secure 2 EAP',
  twint: 'TWINT',
  upi: 'UPI',
  us_bank_account: 'US Bank Account',
  visa_checkout: 'Visa Checkout',
  wechat: 'WeChat',
  wechat_pay: 'WeChat Pay',
  zip: 'Zip',
};

// Export the payment methods as an array of objects with value and label
export const PAYMENT_METHODS = Object.entries(PAYMENT_METHODS_CONFIG).map(
  ([value, label]) => ({ value, label })
);

export const STORAGE_KEYS = {
  SELECTED_MERCHANT_ID: '@stripe_connect_demo:selected_merchant_id',
  BACKEND_URL: '@stripe_connect_demo:backend_url',
  APPEARANCE_PRESET: '@stripe_connect_demo:appearance_preset',
  ONBOARDING_SETTINGS: '@stripe_connect_demo:onboarding_settings',
  PAYMENTS_FILTER_SETTINGS: '@stripe_connect_demo:payments_filter_settings',
  VIEW_CONTROLLER_SETTINGS: '@stripe_connect_demo:view_controller_settings',
};

// Export appearance preset names as an array
export const APPEARANCE_PRESET_NAMES = Object.keys(
  APPEARANCE_PRESETS
) as (keyof typeof APPEARANCE_PRESETS)[];
