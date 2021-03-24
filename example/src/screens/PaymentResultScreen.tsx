import React from 'react';
import { PaymentIntent, useStripe } from 'stripe-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './HomeScreen';
import Screen from '../components/Screen';

type ScreenRouteProp = RouteProp<RootStackParamList, 'PaymentResultScreen'>;

type Props = {
  route: ScreenRouteProp;
};

export default function PaymentResultScreen({ route }: Props) {
  const [paymentIntentResult, setPaymentIntent] = useState<PaymentIntent>();
  const { retrievePaymentIntent } = useStripe();

  const retrievePaymentIntentObject = useCallback(
    async (clientSecret) => {
      const { paymentIntent, error } = await retrievePaymentIntent(
        clientSecret
      );
      if (error) {
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else if (paymentIntent) {
        setPaymentIntent(paymentIntent);
        Alert.alert('Payment intent status:', paymentIntent.status);
      }
    },
    [retrievePaymentIntent]
  );

  useEffect(() => {
    const { url } = route.params;
    const paymentIntentClientSecret = /payment_intent_client_secret=(.*)&/.exec(
      url
    );

    if (paymentIntentClientSecret?.[1]) {
      retrievePaymentIntentObject(paymentIntentClientSecret[1]);
    }
  }, [retrievePaymentIntentObject, route]);

  return (
    <Screen>
      <Text>{JSON.stringify(paymentIntentResult, null, 2)}</Text>
    </Screen>
  );
}
