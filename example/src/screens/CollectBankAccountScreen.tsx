import React from 'react';
import { Alert } from 'react-native';
import { useFinancialConnectionsSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function PayPalScreen() {
  const [clientSecret, setClientSecret] = React.useState('');
  const { loading, presentFinancialConnectionsSheet } =
    useFinancialConnectionsSheet();

  React.useEffect(() => {
    fetchPaymentIntentClientSecret();
  }, []);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/financial-connections-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'eur',
        payment_method_types: ['paypal'],
      }),
    });
    const { clientSecret: secret, error } = await response.json();
    if (error) {
      Alert.alert('Error fetching client secret: ', error);
    } else {
      setClientSecret(secret);
    }
  };

  const handleCollectPress = async () => {
    const { session, error } = await presentFinancialConnectionsSheet(
      clientSecret
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error);
    } else if (session) {
      Alert.alert('Success');
      console.log(
        'Successfully obtained session: ',
        JSON.stringify(session, null, 2)
      );
    }
  };

  return (
    <PaymentScreen>
      <Button
        variant="primary"
        onPress={handleCollectPress}
        title="Collect"
        accessibilityLabel="Collect"
        loading={loading}
        disabled={!clientSecret}
      />
    </PaymentScreen>
  );
}
