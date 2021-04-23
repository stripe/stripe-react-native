import { API_URL } from './Config';

export async function fetchPublishableKey(paymentMethod?: string) {
  const response = await fetch(
    `${API_URL}/stripe-key?paymentMethod=${paymentMethod}`
  );
  const { publishableKey } = await response.json();
  return publishableKey;
}
