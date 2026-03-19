import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { EmbeddedPaymentElementResult } from '@stripe/stripe-react-native';
import React from 'react';
import { StatusBar } from 'react-native';
import { colors } from './colors';
import { useNavigationPersistence } from './hooks/useNavigationPersistence';
import ACHPaymentScreen from './screens/ACHPaymentScreen';
import ACHSetupScreen from './screens/ACHSetupScreen';
import AffirmScreen from './screens/AffirmScreen';
import AfterpayClearpayPaymentScreen from './screens/AfterpayClearpayPaymentScreen';
import AlipayPaymentScreen from './screens/AlipayPaymentScreen';
import AlmaPaymentScreen from './screens/AlmaPaymentScreen';
import ApplePayScreen from './screens/ApplePayScreen';
import AuBECSDebitPaymentScreen from './screens/AuBECSDebitPaymentScreen';
import AuBECSDebitSetupPaymentScreen from './screens/AuBECSDebitSetupPaymentScreen';
import BancontactPaymentScreen from './screens/BancontactPaymentScreen';
import BancontactSetupFuturePaymentScreen from './screens/BancontactSetupFuturePaymentScreen';
import BilliePaymentScreen from './screens/BilliePaymentScreen';
import CashAppScreen from './screens/CashAppScreen';
import CollectBankAccountScreen from './screens/CollectBankAccountScreen';
import ConnectAccountOnboardingScreen from './screens/ConnectAccountOnboardingScreen';
import ConnectPaymentsListScreen from './screens/ConnectPaymentsListScreen';
import ConnectPayoutsListScreen from './screens/ConnectPayoutsListScreen';
import CreateTokenScreen from './screens/CreateTokenScreen';
import CustomerSheetScreen from './screens/CustomerSheetScreen';
import CustomerSheetScreenCustomerSession from './screens/CustomerSheetScreenCustomerSession';
import CVCReCollectionScreen from './screens/CVCReCollectionScreen';
import EmbeddedPaymentElementConfirmScreen from './screens/EmbeddedPaymentElementConfirmScreen';
import EmbeddedPaymentElementImmediateActionScreen from './screens/EmbeddedPaymentElementImmediateActionScreen';
import EmbeddedPaymentElementScreen from './screens/EmbeddedPaymentElementScreen';
import EPSPaymentScreen from './screens/EPSPaymentScreen';
import GooglePayScreen from './screens/GooglePayScreen';
import GrabPayPaymentScreen from './screens/GrabPayPaymentScreen';
import HomeScreen from './screens/HomeScreen';
import IdealPaymentScreen from './screens/IdealPaymentScreen';
import IdealSetupFuturePaymentScreen from './screens/IdealSetupFuturePaymentScreen';
import KlarnaPaymentScreen from './screens/KlarnaPaymentScreen';
import MultilineWebhookPaymentScreen from './screens/MultilineWebhookPaymentScreen';
import NoWebhookPaymentScreen from './screens/NoWebhookPaymentScreen';
import NoWebhookSetupScreen from './screens/NoWebhookSetupScreen';
import OxxoPaymentScreen from './screens/OxxoPaymentScreen';
import P24PaymentScreen from './screens/P24PaymentScreen';
import PaymentResultScreen from './screens/PaymentResultScreen';
import PaymentSheetDeferredIntentMultiStepScreen from './screens/PaymentSheetDeferredIntentMultiStepScreen';
import PaymentSheetDeferredIntentScreen from './screens/PaymentSheetDeferredIntentScreen';
import PaymentSheetWithPmoSfuScreen from './screens/PaymentSheetWithPmoSfuScreen';
import PaymentSheetWithSetupIntent from './screens/PaymentSheetWithSetupIntent';
import PaymentsUICompleteScreen from './screens/PaymentsUICompleteScreen';
import PaymentsUICustomScreen from './screens/PaymentsUICustomScreen';
import PayPalScreen from './screens/PayPalScreen';
import RevolutPayScreen from './screens/RevolutPayScreen';
import SepaPaymentScreen from './screens/SepaPaymentScreen';
import SepaSetupFuturePaymentScreen from './screens/SepaSetupFuturePaymentScreen';
import SetupFuturePaymentScreen from './screens/SetupFuturePaymentScreen';
import WebhookPaymentScreen from './screens/WebhookPaymentScreen';
import CryptoOnrampFlow from './screens/Onramp/CryptoOnrampFlow';
import RegisterCryptoUserScreen from './screens/Onramp/RegisterCryptoUserScreen';
import PaymentMethodMessagingElementScreen from './screens/PaymentMethodMessagingElementScreen';

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
  BilliePaymentScreen: undefined;
  AlmaPaymentScreen: undefined;
  SepaPaymentScreen: undefined;
  SepaSetupFuturePaymentScreen: undefined;
  OxxoPaymentScreen: undefined;
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
  CustomerSheetScreenCustomerSession: undefined;
  RevolutPayScreen: undefined;
  PaymentSheetWithPmoSfuScreen: undefined;
  ConnectAccountOnboardingScreen: undefined;
  ConnectPaymentsListScreen: undefined;
  ConnectPayoutsListScreen: undefined;
  CryptoOnrampFlow: undefined;
  RegisterCryptoUserScreen: undefined;
  PaymentMethodMessagingElementScreen: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default function App() {
  const { isReady, initialState, onStateChange } = useNavigationPersistence();

  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar
        backgroundColor={colors.blurple_dark}
        barStyle="light-content"
        translucent
      />
      <NavigationContainer
        initialState={initialState}
        onStateChange={onStateChange}
      >
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
            name="BilliePaymentScreen"
            component={BilliePaymentScreen}
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
          <Stack.Screen
            name="CustomerSheetScreenCustomerSession"
            component={CustomerSheetScreenCustomerSession}
          />
          <Stack.Screen name="RevolutPayScreen" component={RevolutPayScreen} />
          <Stack.Screen
            name="PaymentSheetWithPmoSfuScreen"
            component={PaymentSheetWithPmoSfuScreen}
          />
          <Stack.Screen name="CryptoOnrampFlow" component={CryptoOnrampFlow} />
          <Stack.Screen
            name="RegisterCryptoUserScreen"
            component={RegisterCryptoUserScreen}
          />
          <Stack.Screen
            name="AlmaPaymentScreen"
            component={AlmaPaymentScreen}
          />
          <Stack.Screen
            name="ConnectAccountOnboardingScreen"
            component={ConnectAccountOnboardingScreen}
          />
          <Stack.Screen
            name="ConnectPaymentsListScreen"
            component={ConnectPaymentsListScreen}
          />
          <Stack.Screen
            name="ConnectPayoutsListScreen"
            component={ConnectPayoutsListScreen}
          />
          <Stack.Screen
            name="PaymentMethodMessagingElementScreen"
            component={PaymentMethodMessagingElementScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
