import React from 'react';
import { Alert } from 'react-native';
import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from '../screens/ConnectScreen';

export default function ConnectPayoutsView() {
  return (
    <ConnectScreen>
      <ConnectPayouts
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
}
