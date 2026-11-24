import React from 'react';
import { Text, View } from 'react-native';
import {
  CardField,
  StripeProvider,
  useStripe,
} from '@stripe/stripe-react-native';

function Probe() {
  const { initPaymentSheet } = useStripe();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text>{`initPaymentSheet: ${typeof initPaymentSheet}`}</Text>
      <CardField postalCodeEnabled={false} style={{ height: 50 }} />
    </View>
  );
}

export default function App() {
  return (
    <StripeProvider publishableKey="pk_test_smoke">
      <Probe />
    </StripeProvider>
  );
}
