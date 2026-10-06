import type { Checkout } from '@stripe/stripe-react-native';
import { hostedBackendURL } from './backend';

export type PaymentElementMode = 'sheet' | 'view';
export type Currency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud' | 'jpy';
export type CustomerType = 'guest' | 'new' | 'returning';
export type EmailSource = 'none' | 'checkoutSession' | 'customer' | 'local';
export type CartScenario = 'standard' | 'zeroAmount';
export type BillingAddressCollection = 'automatic' | 'required';
export type DefaultShippingAddressOption = 'none' | 'usTestAddress' | 'custom';
export type BackendOption = 'hosted' | 'localhost' | 'manual';
export type AdaptivePricingCountry =
  | 'none'
  | 'US'
  | 'FR'
  | 'DE'
  | 'JP'
  | 'GB'
  | 'BR';

export type ShippingAddressDraft = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type PlaygroundSettings = {
  paymentElementMode: PaymentElementMode;
  currency: Currency;
  customerType: CustomerType;
  backendOption: BackendOption;
  backendURL: string;
  emailSource: EmailSource;
  email: string;
  cartScenario: CartScenario;
  collectShippingAddress: boolean;
  defaultShippingAddressOption: DefaultShippingAddressOption;
  customShippingAddress: ShippingAddressDraft;
  billingAddressCollection: BillingAddressCollection;
  automaticPaymentMethods: boolean;
  automaticTax: boolean;
  paymentMethodSave: boolean;
  paymentMethodRemove: boolean;
  linkMode: 'automatic' | 'never';
  adaptivePricingCountry: AdaptivePricingCountry;
  paymentMethodTypes: string[];
};

export type CheckoutCartParams = {
  clientSecret: string;
  settings: PlaygroundSettings;
};

export const checkoutPlaygroundSettingsKey =
  'CheckoutPlaygroundSettings.reactNative';

export const usTestAddress: ShippingAddressDraft = {
  name: 'Jenny Rosen',
  line1: '510 Townsend St',
  line2: '',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94103',
  country: 'US',
};

export const defaultPlaygroundSettings: PlaygroundSettings = {
  paymentElementMode: 'sheet',
  currency: 'usd',
  customerType: 'guest',
  backendOption: 'hosted',
  backendURL: hostedBackendURL,
  emailSource: 'checkoutSession',
  email: 'jenny@example.com',
  cartScenario: 'standard',
  collectShippingAddress: true,
  defaultShippingAddressOption: 'none',
  customShippingAddress: usTestAddress,
  billingAddressCollection: 'automatic',
  automaticPaymentMethods: false,
  automaticTax: true,
  paymentMethodSave: true,
  paymentMethodRemove: true,
  linkMode: 'automatic',
  adaptivePricingCountry: 'none',
  paymentMethodTypes: ['card'],
};

export const backendURLForOption = (option: BackendOption): string | null => {
  switch (option) {
    case 'hosted':
      return hostedBackendURL;
    case 'localhost':
      return 'http://127.0.0.1:8081';
    case 'manual':
      return null;
  }
};

export function resolvedEmail(settings: PlaygroundSettings): string | null {
  if (settings.emailSource === 'none') {
    return null;
  }
  if (
    settings.adaptivePricingCountry !== 'none' &&
    (settings.emailSource === 'checkoutSession' ||
      settings.emailSource === 'customer')
  ) {
    return `test+location_${settings.adaptivePricingCountry}@example.com`;
  }
  const email = settings.email.trim();
  return email || null;
}

export function validateSettings(settings: PlaygroundSettings): string | null {
  if (
    settings.emailSource === 'checkoutSession' &&
    settings.customerType !== 'guest'
  ) {
    return 'Checkout Session server email requires Guest. Choose Guest or a different email source.';
  }
  if (
    settings.emailSource === 'customer' &&
    settings.customerType === 'guest'
  ) {
    return 'Customer server email requires a New or Returning customer.';
  }
  if (
    settings.adaptivePricingCountry !== 'none' &&
    !['checkoutSession', 'customer'].includes(settings.emailSource)
  ) {
    return 'Adaptive Pricing location requires a server email source.';
  }
  if (
    ['checkoutSession', 'customer'].includes(settings.emailSource) &&
    !resolvedEmail(settings)
  ) {
    return 'Enter a server email, or choose None for no email.';
  }
  if (
    !settings.automaticPaymentMethods &&
    settings.paymentMethodTypes.length === 0
  ) {
    return 'Select at least one payment method.';
  }
  if (!/^https?:\/\/[^\s]+$/i.test(settings.backendURL)) {
    return 'Enter a valid backend URL.';
  }
  return null;
}

const lineItems = (settings: PlaygroundSettings) =>
  settings.cartScenario === 'zeroAmount'
    ? [{ name: 'Free T-Shirt', unitAmount: 0, quantity: 1 }]
    : [
        { name: 'Classic T-Shirt', unitAmount: 3500, quantity: 2 },
        { name: 'Zip-Up Hoodie', unitAmount: 5000, quantity: 1 },
      ];

export function buildSessionParameters(
  settings: PlaygroundSettings,
  customerID?: string,
  platform: 'ios' | 'android' = 'ios'
): object {
  const params: Record<string, unknown> = {
    // Android currently accepts `elements`; iOS uses the preview UI mode.
    ui_mode: platform === 'android' ? 'elements' : 'mobile_elements',
    currency: settings.currency,
    items: [
      {
        type: 'one_time_price',
        one_time_price: {
          items: lineItems(settings).map((item) => ({
            price_data: {
              currency: settings.currency,
              unit_amount: item.unitAmount,
              product_data: {
                name: item.name,
                tax_code: 'txcd_99999999',
              },
              tax_behavior: 'exclusive',
            },
            quantity: item.quantity,
          })),
        },
      },
    ],
  };

  if (!settings.automaticPaymentMethods) {
    params.payment_method_types = [...settings.paymentMethodTypes].sort();
  }
  if (settings.automaticTax) {
    params.automatic_tax = { enabled: true };
  }
  if (settings.billingAddressCollection === 'required') {
    params.billing_address_collection = 'required';
  }
  if (settings.collectShippingAddress) {
    params.shipping_address_collection = {
      allowed_countries: ['US', 'CA', 'IE', 'GB'],
    };
  }
  if (customerID) {
    params.customer = customerID;
    if (settings.automaticTax) {
      params.customer_update = {
        ...(settings.billingAddressCollection === 'required'
          ? { address: 'auto' }
          : {}),
        ...(settings.collectShippingAddress ? { shipping: 'auto' } : {}),
      };
    }
  } else {
    if (settings.emailSource === 'checkoutSession') {
      params.customer_email = resolvedEmail(settings);
    }
    if (settings.paymentMethodSave) {
      params.customer_creation = 'always';
    }
  }
  if (customerID || settings.paymentMethodSave) {
    params.saved_payment_method_options = {
      payment_method_save: settings.paymentMethodSave ? 'enabled' : 'disabled',
      payment_method_remove: settings.paymentMethodRemove
        ? 'enabled'
        : 'disabled',
    };
  }
  return params;
}

export function checkoutConfiguration(
  params: CheckoutCartParams
): Checkout.CreateOptions {
  const { clientSecret, settings } = params;
  const address =
    settings.defaultShippingAddressOption === 'usTestAddress'
      ? usTestAddress
      : settings.customShippingAddress;
  const defaults: Checkout.Defaults = {};
  if (settings.emailSource === 'local') {
    defaults.email = resolvedEmail(settings) ?? undefined;
  }
  if (settings.defaultShippingAddressOption !== 'none') {
    defaults.shippingDetails = {
      name: address.name,
      address: {
        country: address.country,
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      },
    };
  }
  return {
    clientSecret,
    returnURL: 'com.stripe.react.native://safepay',
    merchantDisplayName: 'Stripe Shop',
    defaults,
    paymentElement: {
      billingDetailsCollectionConfiguration: {
        address:
          settings.billingAddressCollection === 'required'
            ? 'full'
            : 'automatic',
      },
      link: { display: settings.linkMode },
    },
  };
}
