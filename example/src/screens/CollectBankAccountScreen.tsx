import React from 'react';
import { Alert } from 'react-native';
import { useFinancialConnectionsSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import type { FinancialConnectionsEvent } from '@stripe/stripe-react-native/src/types/FinancialConnections';

export default function CollectBankAccountScreen() {
  const [clientSecret, setClientSecret] = React.useState('');
  const {
    loading,
    collectBankAccountToken,
    collectFinancialConnectionsAccounts,
  } = useFinancialConnectionsSheet();

  React.useEffect(() => {
    fetchClientSecret();
  }, []);

  const fetchClientSecret = async () => {
    const response = await fetch(`${API_URL}/financial-connections-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { clientSecret: secret, error } = await response.json();
    if (error) {
      Alert.alert('Error fetching client secret: ', error);
    } else {
      setClientSecret(secret);
    }
  };

  const handleCollectTokenPress = async () => {
    const { session, token, error } = await collectBankAccountToken(
      clientSecret,
      {
        onEvent: (event: FinancialConnectionsEvent) => {
          console.log('Event received:', event);
        },
      }
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log(error);
    } else {
      Alert.alert('Success');
      console.log(
        'Successfully obtained session: ',
        JSON.stringify(session, null, 2)
      );
      console.log(
        'Successfully obtained token: ',
        JSON.stringify(token, null, 2)
      );
    }
  };

  const handleCollectSessionPress = async () => {
    const { session, error } = await collectFinancialConnectionsAccounts(
      clientSecret,
      {
        onEvent: (event: FinancialConnectionsEvent) => {
          console.log('Event received:', event);
        },
      }
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log(error);
    } else {
      Alert.alert('Success');
      console.log(
        'Successfully obtained session: ',
        JSON.stringify(session, null, 2)
      );
    }
  };

  return (
    <PaymentScreen paymentMethod="us_bank_account">
      <Button
        variant="primary"
        onPress={handleCollectTokenPress}
        title={!clientSecret ? 'loading...' : 'Collect token'}
        loading={loading}
        disabled={!clientSecret}
      />
      <Button
        variant="primary"
        onPress={handleCollectSessionPress}
        title={!clientSecret ? 'loading...' : 'Collect session'}
        loading={loading}
        disabled={!clientSecret}
      />
    </PaymentScreen>
  );
}
