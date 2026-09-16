import { Platform } from 'react-native';

const backendURL = 'https://stp-mobile-playground-backend-v7.stripedemos.com';

async function request(
  path: string,
  body?: object
): Promise<Record<string, unknown>> {
  const response = await fetch(`${backendURL}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof result.error === 'string' ? result.error : JSON.stringify(result)
    );
  }
  return result;
}

export async function fetchCheckoutPublishableKey(): Promise<string> {
  const result = await request('publishable_key?merchant=us_tax');
  if (
    typeof result.publishable_key !== 'string' ||
    !result.publishable_key.startsWith('pk_test_')
  ) {
    throw new Error('The Checkout playground requires a test publishable key.');
  }
  return result.publishable_key;
}

export async function createCheckoutSession(
  requestParams: object
): Promise<string> {
  const result = await request('create_checkout_session', {
    merchant: 'us_tax',
    stripe_version: '2026-08-26.preview',
    request_params: requestParams,
  });
  if (typeof result.client_secret !== 'string') {
    throw new Error(
      'The backend did not return a Checkout Session client secret.'
    );
  }
  return result.client_secret;
}

export const defaultSessionParameters = {
  // TODO: Use mobile_elements on Android once the native SDK accepts it.
  ui_mode: Platform.OS === 'android' ? 'elements' : 'mobile_elements',
  currency: 'usd',
  customer_email: 'jenny@example.com',
  payment_method_types: ['card'],
  items: [
    {
      type: 'one_time_price',
      one_time_price: {
        items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: 1000,
              product_data: { name: 'Test shirt' },
            },
            quantity: 1,
          },
        ],
      },
    },
  ],
};
