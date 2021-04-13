import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { Linking, Platform, StyleSheet, View, ScrollView } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import Screen from '../components/Screen';

export type RootStackParamList = {
  PaymentResultScreen: { url: string };
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { handleURLCallback } = useStripe();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url && url.includes('safepay')) {
        await handleURLCallback(url);
        navigation.navigate('PaymentResultScreen', { url });
      }
    },
    [navigation, handleURLCallback]
  );

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    const urlCallback = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    getUrlAsync();

    Linking.addEventListener('url', urlCallback);

    return () => Linking.removeEventListener('url', urlCallback);
  }, [handleDeepLink]);

  return (
    <Screen>
      <ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            title="Card payment using webhooks"
            onPress={() => {
              navigation.navigate('WebhookPayment');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Card payment without webhooks"
            onPress={() => {
              navigation.navigate('NoWebhookPayment');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="BECS Direct Debit payment"
            onPress={() => {
              navigation.navigate('AuBECSDebitPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Setup Future Card Payment"
            onPress={() => {
              navigation.navigate('SetupFuturePayment');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="iDEAL payment"
            onPress={() => {
              navigation.navigate('IdealPayment');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Setup Future iDEAL Payment"
            onPress={() => {
              navigation.navigate('IdealSetupFuturePaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="FPX Payment"
            onPress={() => {
              navigation.navigate('FPXPaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Alipay Payment"
            onPress={() => {
              navigation.navigate('AlipayPaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Sofort Payment"
            onPress={() => {
              navigation.navigate('SofortPaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Setup Future Sofort Payment"
            onPress={() => {
              navigation.navigate('SofortSetupFuturePaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Bancontact Payment"
            onPress={() => {
              navigation.navigate('BancontactPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Oxxo Payment"
            onPress={() => {
              navigation.navigate('OxxoPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="EPS Payment"
            onPress={() => {
              navigation.navigate('EPSPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Setup Future Bancontact Payment"
            onPress={() => {
              navigation.navigate('BancontactSetupFuturePaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="SEPA Direct Debit payment"
            onPress={() => {
              navigation.navigate('SepaPaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Setup Future SEPA Direct Debit payment"
            onPress={() => {
              navigation.navigate('SepaSetupFuturePaymentScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="GrabPay Payment"
            onPress={() => {
              navigation.navigate('GrabPayPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Przelewy24 Payment"
            onPress={() => {
              navigation.navigate('P24PaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Giropay Payment"
            onPress={() => {
              navigation.navigate('GiropayPaymentScreen');
            }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Afterpay/Clearpay Payment"
            onPress={() => {
              navigation.navigate('AfterpayClearpayPaymentScreen');
            }}
          />
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.buttonContainer}>
            <Button
              title="Apple Pay payment"
              onPress={() => {
                navigation.navigate('ApplePay');
              }}
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Re-collect CVC"
            onPress={() => {
              navigation.navigate('CVCReCollectionScreen');
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
