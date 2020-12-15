import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { StripeProvider } from 'react-native-stripe-sdk';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { API_URL } from './Config';
import WebhookPaymentScreen from './screens/WebhookPaymentScreen';
import HomeScreen from './screens/HomeScreen';
import NoWebhookPaymentScreen from './screens/NoWebhookPaymentScreen';
import ApplePayScreen from './screens/ApplePayScreen';
import SetupFuturePaymentScreen from './screens/SetupFuturePaymentScreen';
import { StatusBar, StyleSheet } from 'react-native';
import { colors } from './colors';

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
    <StripeProvider
      publishableKey={publishableKey}
      appInfo={{
        name: 'react-native-stripe-sdk',
        version: '0.0.1',
        partnerId: 'partnerId',
        url: 'http://your-website.com',
      }}
      merchantIdentifier="merchant.com.react.native.stripe.sdk"
      threeDSecureParams={{
        backgroundColor: colors.white,
        timeout: 5,
        label: {
          headingTextColor: colors.slate,
          headingFontSize: 13,
        },
        navigationBar: {
          headerText: '3d secure',
        },
        footer: {
          backgroundColor: colors.white,
        },
        submitButton: {
          textColor: colors.white,
          textFontSize: 12,
        },
      }}
    >
      <StatusBar
        backgroundColor={colors.blurple_dark}
        barStyle="light-content"
        translucent
      />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerTintColor: colors.white,
            headerStyle: {
              shadowOpacity: 0,
              backgroundColor: colors.blurple,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.slate,
            },
            headerTitleStyle: {
              color: colors.white,
            },
            headerBackTitleStyle: {
              color: colors.white,
            },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="WebhookPayment"
            component={WebhookPaymentScreen}
          />
          <Stack.Screen
            name="NoWebhookPayment"
            component={NoWebhookPaymentScreen}
          />
          <Stack.Screen name="ApplePay" component={ApplePayScreen} />
          <Stack.Screen
            name="SetupFuturePayment"
            component={SetupFuturePaymentScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
