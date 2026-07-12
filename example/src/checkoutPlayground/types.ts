import { CurrencySelectorLabelContent } from '@stripe/stripe-react-native/src/components/CurrencySelectorElement';
import type {
  CurrencySelectorShape,
  CurrencySelectorTheme,
} from './CurrencySelectorAppearanceConfig';

export const hostedCheckoutEndpoint =
  'https://stp-mobile-playground-backend-v7.stripedemos.com/checkout_session';

export type CheckoutPlaygroundMode = 'payment' | 'subscription' | 'setup';

export type CheckoutPlaygroundCurrency =
  | 'usd'
  | 'eur'
  | 'gbp'
  | 'cad'
  | 'aud'
  | 'jpy';

export type CheckoutPlaygroundCustomerType = 'returning' | 'new' | 'guest';

export type AdaptivePricingCountry =
  | 'none'
  | 'us'
  | 'fr'
  | 'de'
  | 'jp'
  | 'gb'
  | 'br';

export type CheckoutPlaygroundIntegrationType =
  | 'paymentSheetFlowController'
  | 'embedded';

export type SelectionOption<T extends string> = {
  label: string;
  value: T;
};

export type CheckoutPlaygroundConfig = {
  mode: CheckoutPlaygroundMode;
  currency: CheckoutPlaygroundCurrency;
  customerType: CheckoutPlaygroundCustomerType;
  integrationType: CheckoutPlaygroundIntegrationType;
  enableShipping: boolean;
  allowPromotionCodes: boolean;
  phoneNumberCollection: boolean;
  shippingAddressCollection: boolean;
  billingAddressCollection: boolean;
  automaticTax: boolean;
  adaptivePricing: boolean;
  checkoutSessionPaymentMethodSave: boolean;
  checkoutSessionPaymentMethodRemove: boolean;
  adaptivePricingCountry: AdaptivePricingCountry;
  currencySelectorTheme: CurrencySelectorTheme;
  currencySelectorLabelContent: CurrencySelectorLabelContent;
  currencySelectorShape: CurrencySelectorShape;
  paymentMethodTypes: string[];
};

export const modeOptions: SelectionOption<CheckoutPlaygroundMode>[] = [
  { label: 'Payment', value: 'payment' },
  { label: 'Subscription', value: 'subscription' },
  { label: 'Setup', value: 'setup' },
];

export const currencyOptions: Array<
  SelectionOption<CheckoutPlaygroundCurrency> & {
    symbol: string;
    isZeroDecimal?: boolean;
  }
> = [
  { label: 'USD', value: 'usd', symbol: '$' },
  { label: 'EUR', value: 'eur', symbol: 'EUR ' },
  { label: 'GBP', value: 'gbp', symbol: 'GBP ' },
  { label: 'CAD', value: 'cad', symbol: 'CAD ' },
  { label: 'AUD', value: 'aud', symbol: 'AUD ' },
  { label: 'JPY', value: 'jpy', symbol: 'JPY ', isZeroDecimal: true },
];

export const customerTypeOptions: SelectionOption<CheckoutPlaygroundCustomerType>[] =
  [
    { label: 'Guest', value: 'guest' },
    { label: 'New', value: 'new' },
    { label: 'Returning', value: 'returning' },
  ];

export const integrationTypeOptions: SelectionOption<CheckoutPlaygroundIntegrationType>[] =
  [
    {
      label: 'PaymentSheet.FlowController',
      value: 'paymentSheetFlowController',
    },
    { label: 'Embedded', value: 'embedded' },
  ];

export const adaptivePricingCountryOptions: SelectionOption<AdaptivePricingCountry>[] =
  [
    { label: 'None', value: 'none' },
    { label: 'US', value: 'us' },
    { label: 'FR', value: 'fr' },
    { label: 'DE', value: 'de' },
    { label: 'JP', value: 'jp' },
    { label: 'GB', value: 'gb' },
    { label: 'BR', value: 'br' },
  ];

export const availablePaymentMethods = [
  'card',
  'us_bank_account',
  'cashapp',
  'affirm',
  'klarna',
] as const;

export const defaultCheckoutPlaygroundConfig: CheckoutPlaygroundConfig = {
  mode: 'payment',
  currency: 'usd',
  customerType: 'guest',
  integrationType: 'paymentSheetFlowController',
  enableShipping: true,
  allowPromotionCodes: true,
  phoneNumberCollection: false,
  shippingAddressCollection: true,
  billingAddressCollection: false,
  automaticTax: true,
  adaptivePricing: false,
  checkoutSessionPaymentMethodSave: true,
  checkoutSessionPaymentMethodRemove: true,
  adaptivePricingCountry: 'none',
  currencySelectorTheme: 'default',
  currencySelectorLabelContent: CurrencySelectorLabelContent.Automatic,
  currencySelectorShape: 'capsule',
  paymentMethodTypes: ['card'],
};

export const supportsAdvancedCollection = (
  config: Pick<CheckoutPlaygroundConfig, 'mode'>
): boolean => config.mode !== 'setup';

export const shouldShowAutomaticTax = (
  config: Pick<CheckoutPlaygroundConfig, 'mode' | 'customerType'>
): boolean =>
  supportsAdvancedCollection(config) && config.customerType !== 'new';

export const shouldShowAdaptivePricingCountry = (
  config: Pick<CheckoutPlaygroundConfig, 'adaptivePricing'>
): boolean => config.adaptivePricing;

export const normalizePaymentMethodTypes = (
  paymentMethodTypes: string[]
): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  paymentMethodTypes.forEach((value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
};

export const getIntegrationTypeLabel = (
  integrationType: CheckoutPlaygroundIntegrationType
): string =>
  integrationTypeOptions.find((option) => option.value === integrationType)
    ?.label ?? integrationType;
