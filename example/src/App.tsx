import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WebhookPaymentScreen from './screens/WebhookPaymentScreen';
import HomeScreen from './screens/HomeScreen';
import NoWebhookPaymentScreen from './screens/NoWebhookPaymentScreen';
import NoWebhookSetupScreen from './screens/NoWebhookSetupScreen';
import ApplePayScreen from './screens/ApplePayScreen';
import SetupFuturePaymentScreen from './screens/SetupFuturePaymentScreen';
import { StatusBar } from 'react-native';
import { colors } from './colors';
import CreateTokenScreen from './screens/CreateTokenScreen';
import PaymentsUICompleteScreen from './screens/PaymentsUICompleteScreen';
import PaymentSheetWithSetupIntent from './screens/PaymentSheetWithSetupIntent';
import PaymentsUICustomScreen from './screens/PaymentsUICustomScreen';
import CVCReCollectionScreen from './screens/CVCReCollectionScreen';
import IdealPaymentScreen from './screens/IdealPaymentScreen';
import IdealSetupFuturePaymentScreen from './screens/IdealSetupFuturePaymentScreen';
import AlipayPaymentScreen from './screens/AlipayPaymentScreen';
import PaymentResultScreen from './screens/PaymentResultScreen';
import BancontactPaymentScreen from './screens/BancontactPaymentScreen';
import BancontactSetupFuturePaymentScreen from './screens/BancontactSetupFuturePaymentScreen';
import SepaPaymentScreen from './screens/SepaPaymentScreen';
import SepaSetupFuturePaymentScreen from './screens/SepaSetupFuturePaymentScreen';
import OxxoPaymentScreen from './screens/OxxoPaymentScreen';
import GiropayPaymentScreen from './screens/GiropayPaymentScreen';
import EPSPaymentScreen from './screens/EPSPaymentScreen';
import GrabPayPaymentScreen from './screens/GrabPayPaymentScreen';
import P24PaymentScreen from './screens/P24PaymentScreen';
import AuBECSDebitPaymentScreen from './screens/AuBECSDebitPaymentScreen';
import AfterpayClearpayPaymentScreen from './screens/AfterpayClearpayPaymentScreen';
import KlarnaPaymentScreen from './screens/KlarnaPaymentScreen';
import AuBECSDebitSetupPaymentScreen from './screens/AuBECSDebitSetupPaymentScreen';
import MultilineWebhookPaymentScreen from './screens/MultilineWebhookPaymentScreen';
import GooglePayScreen from './screens/GooglePayScreen';
import ACHPaymentScreen from './screens/ACHPaymentScreen';
import ACHSetupScreen from './screens/ACHSetupScreen';
import PayPalScreen from './screens/PayPalScreen';
import AffirmScreen from './screens/AffirmScreen';
import CollectBankAccountScreen from './screens/CollectBankAccountScreen';
import CashAppScreen from './screens/CashAppScreen';
import PaymentSheetDeferredIntentScreen from './screens/PaymentSheetDeferredIntentScreen';
import PaymentSheetDeferredIntentMultiStepScreen from './screens/PaymentSheetDeferredIntentMultiStepScreen';
import EmbeddedPaymentElementScreen from './screens/EmbeddedPaymentElementScreen';
import EmbeddedPaymentElementImmediateActionScreen from './screens/EmbeddedPaymentElementImmediateActionScreen';
import EmbeddedPaymentElementConfirmScreen from './screens/EmbeddedPaymentElementConfirmScreen';
import CustomerSheetScreen from './screens/CustomerSheetScreen';
import RevolutPayScreen from './screens/RevolutPayScreen';
import type { EmbeddedPaymentElementResult } from '@stripe/stripe-react-native';
import PaymentSheetWithPmoSfuScreen from './screens/PaymentSheetWithPmoSfuScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export type RootStackParamList = {
  WebhookPaymentScreen: undefined;
  HomeScreen: undefined;
  NoWebhookPaymentScreen: undefined;
  NoWebhookSetupScreen: undefined;
  CreateTokenScreen: undefined;
  ApplePayScreen: undefined;
  SetupFuturePaymentScreen: undefined;
  PaymentsUICompleteScreen: undefined;
  PaymentSheetWithSetupIntent: undefined;
  PaymentsUICustomScreen: undefined;
  CVCReCollectionScreen: undefined;
  IdealPaymentScreen: undefined;
  IdealSetupFuturePaymentScreen: undefined;
  AlipayPaymentScreen: undefined;
  PaymentResultScreen: { url: string };
  BancontactPaymentScreen: undefined;
  BancontactSetupFuturePaymentScreen: undefined;
  SepaPaymentScreen: undefined;
  SepaSetupFuturePaymentScreen: undefined;
  OxxoPaymentScreen: undefined;
  GiropayPaymentScreen: undefined;
  EPSPaymentScreen: undefined;
  GrabPayPaymentScreen: undefined;
  P24PaymentScreen: undefined;
  AuBECSDebitPaymentScreen: undefined;
  AfterpayClearpayPaymentScreen: undefined;
  KlarnaPaymentScreen: undefined;
  AuBECSDebitSetupPaymentScreen: undefined;
  MultilineWebhookPaymentScreen: undefined;
  GooglePayScreen: undefined;
  ACHPaymentScreen: undefined;
  ACHSetupScreen: undefined;
  PayPalScreen: undefined;
  CashAppScreen: undefined;
  AffirmScreen: undefined;
  CollectBankAccountScreen: undefined;
  PaymentSheetDeferredIntentScreen: undefined;
  PaymentSheetDeferredIntentMultiStepScreen: undefined;
  EmbeddedPaymentElementScreen: undefined;
  EmbeddedPaymentElementImmediateActionScreen: undefined;
  EmbeddedPaymentElementConfirmScreen: {
    confirm: () => Promise<EmbeddedPaymentElementResult>;
  };
  CustomerSheetScreen: undefined;
  RevolutPayScreen: undefined;
  PaymentSheetWithPmoSfuScreen: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default function App() {
  return (
    <>
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
              backgroundColor: colors.blurple,
            },
            headerTitleStyle: {
              color: colors.white,
            },
          }}
        >
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen
            name="WebhookPaymentScreen"
            component={WebhookPaymentScreen}
          />
          <Stack.Screen
            name="MultilineWebhookPaymentScreen"
            component={MultilineWebhookPaymentScreen}
          />
          <Stack.Screen
            name="NoWebhookPaymentScreen"
            component={NoWebhookPaymentScreen}
          />
          <Stack.Screen
            name="NoWebhookSetupScreen"
            component={NoWebhookSetupScreen}
          />
          <Stack.Screen
            name="AuBECSDebitPaymentScreen"
            component={AuBECSDebitPaymentScreen}
          />
          <Stack.Screen
            name="AuBECSDebitSetupPaymentScreen"
            component={AuBECSDebitSetupPaymentScreen}
          />
          <Stack.Screen
            name="CreateTokenScreen"
            component={CreateTokenScreen}
          />
          <Stack.Screen name="ApplePayScreen" component={ApplePayScreen} />
          <Stack.Screen
            name="SetupFuturePaymentScreen"
            component={SetupFuturePaymentScreen}
          />
          <Stack.Screen
            name="PaymentsUICompleteScreen"
            component={PaymentsUICompleteScreen}
          />
          <Stack.Screen
            name="PaymentSheetWithSetupIntent"
            component={PaymentSheetWithSetupIntent}
          />
          <Stack.Screen
            name="PaymentSheetDeferredIntentScreen"
            component={PaymentSheetDeferredIntentScreen}
          />
          <Stack.Screen
            name="PaymentSheetDeferredIntentMultiStepScreen"
            component={PaymentSheetDeferredIntentMultiStepScreen}
          />
          <Stack.Screen
            name="EmbeddedPaymentElementScreen"
            component={EmbeddedPaymentElementScreen}
          />
          <Stack.Screen
            name="EmbeddedPaymentElementImmediateActionScreen"
            component={EmbeddedPaymentElementImmediateActionScreen}
          />
          <Stack.Screen
            name="EmbeddedPaymentElementConfirmScreen"
            component={EmbeddedPaymentElementConfirmScreen}
          />
          <Stack.Screen
            name="PaymentsUICustomScreen"
            component={PaymentsUICustomScreen}
          />
          <Stack.Screen
            name="CVCReCollectionScreen"
            component={CVCReCollectionScreen}
          />
          <Stack.Screen
            name="IdealPaymentScreen"
            component={IdealPaymentScreen}
          />
          <Stack.Screen
            name="IdealSetupFuturePaymentScreen"
            component={IdealSetupFuturePaymentScreen}
          />
          <Stack.Screen
            name="AlipayPaymentScreen"
            component={AlipayPaymentScreen}
          />
          <Stack.Screen name="P24PaymentScreen" component={P24PaymentScreen} />
          <Stack.Screen
            name="PaymentResultScreen"
            component={PaymentResultScreen}
          />
          <Stack.Screen
            name="GrabPayPaymentScreen"
            component={GrabPayPaymentScreen}
          />
          <Stack.Screen
            name="BancontactPaymentScreen"
            component={BancontactPaymentScreen}
          />
          <Stack.Screen name="EPSPaymentScreen" component={EPSPaymentScreen} />
          <Stack.Screen
            name="BancontactSetupFuturePaymentScreen"
            component={BancontactSetupFuturePaymentScreen}
          />
          <Stack.Screen
            name="SepaPaymentScreen"
            component={SepaPaymentScreen}
          />
          <Stack.Screen
            name="SepaSetupFuturePaymentScreen"
            component={SepaSetupFuturePaymentScreen}
          />
          <Stack.Screen
            name="OxxoPaymentScreen"
            component={OxxoPaymentScreen}
          />
          <Stack.Screen
            name="GiropayPaymentScreen"
            component={GiropayPaymentScreen}
          />
          <Stack.Screen
            name="AfterpayClearpayPaymentScreen"
            component={AfterpayClearpayPaymentScreen}
          />
          <Stack.Screen
            name="KlarnaPaymentScreen"
            component={KlarnaPaymentScreen}
          />
          <Stack.Screen name="GooglePayScreen" component={GooglePayScreen} />
          <Stack.Screen name="ACHPaymentScreen" component={ACHPaymentScreen} />
          <Stack.Screen name="ACHSetupScreen" component={ACHSetupScreen} />
          <Stack.Screen name="PayPalScreen" component={PayPalScreen} />
          <Stack.Screen name="CashAppScreen" component={CashAppScreen} />
          <Stack.Screen name="AffirmScreen" component={AffirmScreen} />
          <Stack.Screen
            name="CollectBankAccountScreen"
            component={CollectBankAccountScreen}
          />
          <Stack.Screen
            name="CustomerSheetScreen"
            component={CustomerSheetScreen}
          />
          <Stack.Screen name="RevolutPayScreen" component={RevolutPayScreen} />
          <Stack.Screen
            name="PaymentSheetWithPmoSfuScreen"
            component={PaymentSheetWithPmoSfuScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
