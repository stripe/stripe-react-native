import React from 'react';
import { useStripe } from 'stripe-react-native';
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
  const [result, setResult] = useState<string>();
  const { retrievePaymentIntent } = useStripe();

  const retrievePaymentIntentObject = useCallback(
    async (clientSecret) => {
      const { paymentIntent, error } = await retrievePaymentIntent(
        clientSecret
      );
      if (error) {
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else if (paymentIntent) {
        setResult(JSON.stringify(paymentIntent, null, 2));
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
    } else {
      setResult(url);
    }
  }, [retrievePaymentIntentObject, route]);

  return (
    <Screen>
      <Text>{result}</Text>
    </Screen>
  );
}
