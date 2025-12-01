import type {
  OnboardingSettings,
  PaymentsFilterSettings,
  PaymentStatus,
  AmountFilterType,
  DateFilterType,
} from '../types';
import { APPEARANCE_PRESETS } from './appearancePresets';

export const DEFAULT_BACKEND_URL =
  'https://stripe-connect-mobile-example-v1.stripedemos.com/';

export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = {
  fullTermsOfServiceUrl: '',
  recipientTermsOfServiceUrl: '',
  privacyPolicyUrl: '',
  skipTermsOfService: undefined,
  fieldOption: undefined,
  futureRequirements: undefined,
  requirements: undefined,
};

export const DEFAULT_PAYMENTS_FILTER_SETTINGS: PaymentsFilterSettings = {
  amountFilterType: undefined,
  dateFilterType: undefined,
  selectedStatuses: [],
  paymentMethod: undefined,
};

export const PAYMENT_STATUSES: Array<{
  value: PaymentStatus;
  label: string;
}> = [
  { value: 'blocked', label: 'Blocked' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'early_fraud_warning', label: 'Early Fraud Warning' },
  { value: 'failed', label: 'Failed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
  { value: 'pending', label: 'Pending' },
  { value: 'refund_pending', label: 'Refund Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'successful', label: 'Successful' },
  { value: 'uncaptured', label: 'Uncaptured' },
];

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

export const PAYMENT_METHODS = [
  'None',
  'Ach Credit Transfer',
  'Ach Debit',
  'Acss Debit',
  'Affirm',
  'Afterpay Clearpay',
  'Alipay',
  'Alma',
  'Amazon Pay',
  'Amex Express Checkout',
  'Android Pay',
] as const;

export const STORAGE_KEYS = {
  SELECTED_MERCHANT_ID: '@stripe_connect_demo:selected_merchant_id',
  BACKEND_URL: '@stripe_connect_demo:backend_url',
  APPEARANCE_PRESET: '@stripe_connect_demo:appearance_preset',
  ONBOARDING_SETTINGS: '@stripe_connect_demo:onboarding_settings',
  PAYMENTS_FILTER_SETTINGS: '@stripe_connect_demo:payments_filter_settings',
};

// Re-export appearance presets
export { APPEARANCE_PRESETS as APPEARANCE_PRESET_VALUES } from './appearancePresets';

// Export appearance preset names as an array
export const APPEARANCE_PRESET_NAMES = Object.keys(
  APPEARANCE_PRESETS
) as (keyof typeof APPEARANCE_PRESETS)[];
