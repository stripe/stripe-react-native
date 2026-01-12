import type { Token } from '@stripe/stripe-react-native';
import {
  PaymentMethodMessagingElement
 } from '@stripe/stripe-react-native';
import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function PaymentMethodMessagingElementScreen() {

  return (
    <PaymentScreen>
      <PaymentMethodMessagingElement
        configuration={{
            amount: 5000,
            currency: "usd"
        }}
        onLoadComplete={(e) => {
          console.log('load complete')
          console.log(e)
        }
        }
      />
      <Button
        variant="primary"
        onPress={() => console.log('lol')}
        title="Hold"
      />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  or: {
    textAlign: 'center',
    marginTop: 30,
  },
});
