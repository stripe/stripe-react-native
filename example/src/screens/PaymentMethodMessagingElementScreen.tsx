import type { Token } from '@stripe/stripe-react-native';
import {
  PaymentMethodMessagingElement
 } from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function PaymentMethodMessagingElementScreen() {

  const [price, setPrice] = useState(1000)
  const [config, setConfig] = useState({ amount: price, currency: 'usd' })

  useEffect(() => {
    setConfig({ amount: price, currency: 'usd' })
  }, [price])

  return (
    <PaymentScreen>
      <PaymentMethodMessagingElement
        configuration={config}
        onLoadComplete={(e) => {
          console.log('load complete')
          console.log(e)
        }
        }
      />
      <Button
        variant="primary"
        onPress={() => { setPrice(prev => prev + 1000)}}
        title={`Price ${price} click increase`}
      />
    </PaymentScreen>
  );
}
