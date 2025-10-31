import { ConnectComponentsProvider } from '@stripe/stripe-react-native';
import { useEffect, useState } from 'react';
import { fetchPublishableKey } from '../helpers';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { API_URL } from '../Config';

interface Props {
  children?: React.ReactNode;
}

const ConnectScreen: React.FC<Props> = ({ children }) => {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPublishableKey().then((pk) => {
      if (pk) {
        setPublishableKey(pk);
      }
    });
  }, []);

  return !publishableKey ? (
    <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  ) : (
    <ConnectComponentsProvider
      publishableKey={publishableKey}
      fetchClientSecret={fetchClientSecret}
    >
      {children}
    </ConnectComponentsProvider>
  );
};

export default ConnectScreen;

const fetchClientSecret = async () => {
  // TODO: use a different endpoint
  const response = await fetch(`${API_URL}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currency: 'usd',
    }),
  });
  const json = await response.json();
  const { clientSecret } = json;

  return clientSecret;
};
