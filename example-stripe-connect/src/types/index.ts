// Navigation types
export type RootStackParamList = {
  Home: undefined;
  AccountOnboarding: undefined;
  Payouts: undefined;
  Payments: undefined;
  Settings: undefined;
  OnboardingSettings: undefined;
  PaymentsFilterSettings: undefined;
  ConfigureAppearance: undefined;
};

import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
export type AppearancePreset = keyof typeof APPEARANCE_PRESETS;

// Onboarding settings
export interface OnboardingSettings {
  fullTermsOfServiceUrl?: string;
  recipientTermsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  skipTermsOfService?: boolean;
  fieldOption?: boolean;
  futureRequirements?: boolean;
  requirements?: boolean;
}

// Payment filter types
export type AmountFilterType =
  | 'equals'
  | 'greater_than'
  | 'less_than'
  | 'between';
export type DateFilterType = 'before' | 'after' | 'between';

export type PaymentStatus =
  | 'blocked'
  | 'canceled'
  | 'disputed'
  | 'early_fraud_warning'
  | 'failed'
  | 'incomplete'
  | 'partially_refunded'
  | 'pending'
  | 'refund_pending'
  | 'refunded'
  | 'successful'
  | 'uncaptured';

// Payment filter settings
export interface PaymentsFilterSettings {
  amountFilterType?: AmountFilterType;
  amountValue?: number;
  amountLowerBound?: number;
  amountUpperBound?: number;
  dateFilterType?: DateFilterType;
  dateValue?: string;
  startDate?: string;
  endDate?: string;
  selectedStatuses: PaymentStatus[];
  paymentMethod?: string;
}

// Re-export MerchantInfo from API
export type { MerchantInfo } from '../api/StripeConnectAPI';

// App settings
export interface AppSettings {
  selectedMerchantId: string | null;
  backendUrl: string;
  appearancePreset: AppearancePreset;
  onboardingSettings: OnboardingSettings;
  paymentsFilterSettings: PaymentsFilterSettings;
}
