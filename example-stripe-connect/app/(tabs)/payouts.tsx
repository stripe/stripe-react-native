import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from '../../src/screens/ConnectScreen';

export default function PayoutsTab() {
  return (
    <>
      <Stack.Screen options={{ title: 'Payouts' }} />
      <ConnectScreen>
        <ConnectPayouts
          onLoadError={(err) => {
            Alert.alert('Error', err.error.message);
          }}
        />
      </ConnectScreen>
    </>
  );
}
