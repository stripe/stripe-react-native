import { ConnectPayments } from '@stripe/stripe-react-native';
import { ComponentProps } from 'react';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';

export type PaymentsListDefaultFilters = NonNullable<
  ComponentProps<typeof ConnectPayments>['defaultFilters']
>;

export type PaymentMethod = NonNullable<
  PaymentsListDefaultFilters['paymentMethod']
>;

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

export type PaymentStatus = NonNullable<
  PaymentsListDefaultFilters['status']
>[number];

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
  paymentMethod?: PaymentMethod;
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
