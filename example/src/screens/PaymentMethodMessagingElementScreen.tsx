import {
  PaymentMethodMessagingElement
 } from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function PaymentMethodMessagingElementScreen() {

  const [price, setPrice] = useState(1000)
  const [config, setConfig] = useState({ amount: price, currency: 'usd' })
  const [result, setResult] = useState("")

  useEffect(() => {
    setConfig({ amount: price, currency: 'usd' })
  }, [price])

  return (
    <PaymentScreen>
      <Text>
        {result}
      </Text>
      <PaymentMethodMessagingElement
        configuration={config}
        onLoadComplete={(e) => {
          console.log(e)
          setResult(e.status)
        }
        }
      />
      <Button
        variant="primary"
        onPress={() => { setPrice(prev => prev + 1000)}}
        title={`Price ${price} click to increase`}
      />
      <Button
        variant="primary"
        onPress={() => {setPrice(0)}}
        title='Set price to 0'
      />
      {result === "succeeded" && (                                                                                 
        <View>                                                                                                     
          <Text>PMME is loaded</Text>                                                                              
        </View>                                                                                                    
      )} 
    </PaymentScreen>
  );
}
