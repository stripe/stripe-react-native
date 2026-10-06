export const hostedBackendURL =
  'https://stp-mobile-playground-backend-v7.stripedemos.com';

async function request(
  backendURL: string,
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

export async function fetchCheckoutPublishableKey(
  backendURL = hostedBackendURL
): Promise<string> {
  const result = await request(backendURL, 'publishable_key?merchant=us_tax');
  if (
    typeof result.publishable_key !== 'string' ||
    !result.publishable_key.startsWith('pk_test_')
  ) {
    throw new Error('The Checkout playground requires a test publishable key.');
  }
  return result.publishable_key;
}

export async function createCheckoutSession(
  requestParams: object,
  backendURL = hostedBackendURL
): Promise<string> {
  const result = await request(backendURL, 'create_checkout_session', {
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

export async function createCheckoutCustomer(
  requestParams: object,
  backendURL = hostedBackendURL
): Promise<string> {
  const result = await request(backendURL, 'create_customer', {
    merchant: 'us_tax',
    request_params: requestParams,
  });
  if (typeof result.id !== 'string') {
    throw new Error('The backend did not return a Customer ID.');
  }
  return result.id;
}
