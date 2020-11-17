import React from 'react';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import StripeSdk from 'react-native-stripe-sdk';

const Root = () => (
  <StripeSdk.StripeProvider publishableKey="test">
    <App />
  </StripeSdk.StripeProvider>
);

AppRegistry.registerComponent(appName, () => Root);
