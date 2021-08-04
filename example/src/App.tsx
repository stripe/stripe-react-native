import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WebhookPaymentScreen from './screens/WebhookPaymentScreen';
import HomeScreen from './screens/HomeScreen';
import NoWebhookPaymentScreen from './screens/NoWebhookPaymentScreen';
import ApplePayScreen from './screens/ApplePayScreen';
import SetupFuturePaymentScreen from './screens/SetupFuturePaymentScreen';
import { StatusBar, StyleSheet } from 'react-native';
import { colors } from './colors';
import PaymentsUICompleteScreen from './screens/PaymentsUICompleteScreen';
import PaymentsUICustomScreen from './screens/PaymentsUICustomScreen';
import CVCReCollectionScreen from './screens/CVCReCollectionScreen';
import IdealPaymentScreen from './screens/IdealPaymentScreen';
import IdealSetupFuturePaymentScreen from './screens/IdealSetupFuturePaymentScreen';
import AlipayPaymentScreen from './screens/AlipayPaymentScreen';
import PaymentResultScreen from './screens/PaymentResultScreen';
import SofortPaymentScreen from './screens/SofortPaymentScreen';
import SofortSetupFuturePaymentScreen from './screens/SofortSetupFuturePaymentScreen';
import FPXPaymentScreen from './screens/FPXPaymentScreen';
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
import AuBECSDebitSetupPaymentScreen from './screens/AuBECSDebitSetupPaymentScreen';
import MultilineWebhookPaymentScreen from './screens/MultilineWebhookPaymentScreen';
import GooglePayScreen from './screens/GooglePayScreen';
import WeChatPaymentScreen from './screens/WeChatPaymentScreen';

const Stack = createStackNavigator();

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
            name="MultilineWebhookPaymentScreen"
            component={MultilineWebhookPaymentScreen}
          />
          <Stack.Screen
            name="NoWebhookPayment"
            component={NoWebhookPaymentScreen}
          />
          <Stack.Screen
            name="AuBECSDebitPaymentScreen"
            component={AuBECSDebitPaymentScreen}
          />
          <Stack.Screen
            name="AuBECSDebitSetupPaymentScreen"
            component={AuBECSDebitSetupPaymentScreen}
          />

          <Stack.Screen name="ApplePay" component={ApplePayScreen} />
          <Stack.Screen
            name="SetupFuturePayment"
            component={SetupFuturePaymentScreen}
          />
          <Stack.Screen
            name="PaymentsUICompleteScreen"
            component={PaymentsUICompleteScreen}
          />
          <Stack.Screen
            name="PaymentsUICustom"
            component={PaymentsUICustomScreen}
          />
          <Stack.Screen
            name="CVCReCollectionScreen"
            component={CVCReCollectionScreen}
          />
          <Stack.Screen name="IdealPayment" component={IdealPaymentScreen} />
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
          <Stack.Screen name="FPXPaymentScreen" component={FPXPaymentScreen} />
          <Stack.Screen
            name="SofortPaymentScreen"
            component={SofortPaymentScreen}
          />
          <Stack.Screen
            name="SofortSetupFuturePaymentScreen"
            component={SofortSetupFuturePaymentScreen}
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
          <Stack.Screen name="GooglePayScreen" component={GooglePayScreen} />
          <Stack.Screen
            name="WeChatPaymentScreen"
            component={WeChatPaymentScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
