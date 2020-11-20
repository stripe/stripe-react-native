import React, { useEffect, useState } from 'react';
import { StripeProvider } from 'react-native-stripe-sdk';
import { API_URL } from './Config';
import WebhookPaymentScreen from './WebhookPaymentScreen';

export default function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const response = await fetch(`${API_URL}/stripe-key`);
    const { publishableKey: key } = await response.json();
    setPublishableKey(key);
  };

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  return (
    <StripeProvider publishableKey={publishableKey}>
      <WebhookPaymentScreen />
    </StripeProvider>
  );
}
