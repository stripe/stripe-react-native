import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { StripeProvider } from 'react-native-stripe-sdk';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { API_URL } from './Config';
import WebhookPaymentScreen from './WebhookPaymentScreen';
import HomeScreen from './HomeScreen';
import NoWebhookPaymentScreen from './NoWebhookPaymentScreen';

const Stack = createStackNavigator();

export default function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const response = await fetch(`${API_URL}/stripe-key`);
    const { publishableKey: key } = await response.json();
    setPublishableKey(key);
  };

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  return (
    <StripeProvider publishableKey={publishableKey}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="WebhookPayment"
            component={WebhookPaymentScreen}
          />
          <Stack.Screen
            name="NoWebhookPayment"
            component={NoWebhookPaymentScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
