import { ConnectPayments } from '@stripe/stripe-react-native';
import { ComponentProps } from 'react';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';

export type PaymentsListDefaultFilters = NonNullable<
  ComponentProps<typeof ConnectPayments>['defaultFilters']
>;

export type PaymentMethod = NonNullable<
  PaymentsListDefaultFilters['paymentMethod']
>;

export type AppearancePreset = keyof typeof APPEARANCE_PRESETS;

// Onboarding settings types
export type FieldOption = 'currently_due' | 'eventually_due';
export type FutureRequirements = 'omit' | 'include';
export type Requirements = 'only' | 'exclude';

// Onboarding settings
export interface OnboardingSettings {
  fullTermsOfServiceUrl?: string;
  recipientTermsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  skipTermsOfService?: boolean;
  fieldOption?: FieldOption;
  futureRequirements?: FutureRequirements;
  requirements?: Requirements;
  requirementsList?: string; // Multiline string with one requirement per line
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

// View controller options
export type ViewControllerPresentationType =
  | 'navigation_push'
  | 'present_modally';

export interface ViewControllerSettings {
  presentationType: ViewControllerPresentationType;
  embedInNavigationBar: boolean;
  embedInTabBar: boolean;
}
