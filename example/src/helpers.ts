import { Alert } from 'react-native';
import { API_URL } from './Config';

const fakePublishableKey = true;

export async function fetchPublishableKey(
  paymentMethod?: string
): Promise<string | null> {
  try {
    if (fakePublishableKey) {
      return 'uk_TEZmVlG97Bvkhi3hTJjI1or06NO970Ra00QZ7nWQ3i';
    }
    const response = await fetch(
      `${API_URL}/stripe-key?paymentMethod=${paymentMethod}`
    );

    const { publishableKey } = await response.json();

    return publishableKey;
  } catch (e) {
    console.warn('Unable to fetch publishable key. Is your server running?');
    Alert.alert(
      'Error',
      'Unable to fetch publishable key. Is your server running?'
    );
    return null;
  }
}

export function getClientSecretParams(
  customerKeyType: string,
  remainingParams: any
): any {
  return customerKeyType === 'customer_session'
    ? {
        customerSessionClientSecret:
          remainingParams.customerSessionClientSecret,
      }
    : { customerEphemeralKeySecret: remainingParams.ephemeralKey };
}
