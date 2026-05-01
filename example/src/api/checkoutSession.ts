import {
  hostedCheckoutEndpoint,
  normalizePaymentMethodTypes,
  shouldShowAutomaticTax,
  supportsAdvancedCollection,
  type CheckoutPlaygroundConfig,
} from '../checkoutPlayground/types';

export type CheckoutSessionResponse = {
  publishableKey: string;
  checkoutSessionClientSecret: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCheckoutSessionResponse = (
  value: unknown
): value is CheckoutSessionResponse =>
  isRecord(value) &&
  typeof value.publishableKey === 'string' &&
  value.publishableKey.length > 0 &&
  typeof value.checkoutSessionClientSecret === 'string' &&
  value.checkoutSessionClientSecret.length > 0;

const getCheckoutSessionErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  if (isRecord(value) && typeof value.error === 'string') {
    const trimmedError = value.error.trim();
    return trimmedError || undefined;
  }

  return undefined;
};

async function parseCheckoutSessionResponseBody(response: {
  text(): Promise<string>;
}): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

export type CheckoutSessionRequestBody = {
  merchant_country_code: string;
  mode: CheckoutPlaygroundConfig['mode'];
  currency: CheckoutPlaygroundConfig['currency'];
  customer: CheckoutPlaygroundConfig['customerType'];
  allow_promotion_codes: boolean;
  phone_number_collection: boolean;
  shipping_address_collection: boolean;
  billing_address_collection: boolean;
  include_shipping_options: boolean;
  automatic_tax: boolean;
  payment_method_types: string[];
  adaptive_pricing: boolean;
  checkout_session_payment_method_save: 'enabled' | 'disabled';
  checkout_session_payment_method_remove: 'enabled' | 'disabled';
  customer_email?: string;
};

export function buildCheckoutSessionRequestBody(
  config: CheckoutPlaygroundConfig
): CheckoutSessionRequestBody {
  const advancedCollectionEnabled = supportsAdvancedCollection(config);
  const allowPromotionCodes = advancedCollectionEnabled
    ? config.allowPromotionCodes
    : false;
  const phoneNumberCollection = advancedCollectionEnabled
    ? config.phoneNumberCollection
    : false;
  const automaticTax = shouldShowAutomaticTax(config)
    ? config.automaticTax
    : false;

  // The hosted demo backend uses this synthetic country code to exercise tax flows.
  const body: CheckoutSessionRequestBody = {
    merchant_country_code: 'us_tax',
    mode: config.mode,
    currency: config.currency,
    customer: config.customerType,
    allow_promotion_codes: allowPromotionCodes,
    phone_number_collection: phoneNumberCollection,
    shipping_address_collection: config.shippingAddressCollection,
    billing_address_collection: config.billingAddressCollection,
    include_shipping_options: config.enableShipping,
    automatic_tax: automaticTax,
    payment_method_types: normalizePaymentMethodTypes(
      config.paymentMethodTypes
    ),
    adaptive_pricing: config.adaptivePricing,
    checkout_session_payment_method_save:
      config.checkoutSessionPaymentMethodSave ? 'enabled' : 'disabled',
    checkout_session_payment_method_remove:
      config.checkoutSessionPaymentMethodRemove ? 'enabled' : 'disabled',
  };

  if (config.adaptivePricing && config.adaptivePricingCountry !== 'none') {
    body.customer_email = `test+location_${config.adaptivePricingCountry.toUpperCase()}@example.com`;
  }

  return body;
}

export async function fetchCheckoutSessionParams(
  config: CheckoutPlaygroundConfig
): Promise<CheckoutSessionResponse> {
  if (normalizePaymentMethodTypes(config.paymentMethodTypes).length === 0) {
    throw new Error('Select at least one payment method.');
  }

  const response = await fetch(hostedCheckoutEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildCheckoutSessionRequestBody(config)),
  });

  const responseBody = await parseCheckoutSessionResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getCheckoutSessionErrorMessage(responseBody) ||
        'Failed to create checkout session.'
    );
  }

  if (!isCheckoutSessionResponse(responseBody)) {
    throw new Error('Checkout session response was missing required fields.');
  }

  return {
    publishableKey: responseBody.publishableKey,
    checkoutSessionClientSecret: responseBody.checkoutSessionClientSecret,
  };
}
