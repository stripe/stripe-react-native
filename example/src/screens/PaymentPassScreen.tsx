import React, { useState } from 'react';
import { useStripe } from 'stripe-react-native';
import { API_URL } from '../Config';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { Alert } from 'react-native';

export default function PaymentPassScreen() {
  const [loading, setLoading] = useState(false);
  const { presentPaymentPass, completeCreatingIssueingCardKey } = useStripe();

  const fetchEphemeralKeyFromBackend = async ({
    apiVersion,
    issuingCard,
  }: {
    apiVersion: string;
    issuingCard: string;
  }) => {
    const response = await fetch(`${API_URL}/create-ephemeral-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiVersion,
        issuing_card: issuingCard,
      }),
    });
    const { key } = await response.json();
    return key;
  };

  const present = async () => {
    setLoading(true);
    const { apiVersion, error } = await presentPaymentPass({
      name: 'test',
      description: 'test',
      last4: '4242',
      brand: 'Visa',
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (apiVersion) {
      const key = await fetchEphemeralKeyFromBackend({
        apiVersion,
        issuingCard: 'ic_1ITUqkBDuqlYGNW21ooXSbDh',
      });
      const { error: completeError } = await completeCreatingIssueingCardKey(
        key
      );

      if (completeError) {
        Alert.alert(`Error code: ${completeError.code}`, completeError.message);
      } else {
        Alert.alert('Success');
      }
    }
    setLoading(false);
  };

  return (
    <Screen>
      <Button
        loading={loading}
        onPress={present}
        title="Present Payment Pass"
        variant="primary"
      />
    </Screen>
  );
}
