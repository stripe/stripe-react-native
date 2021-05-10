import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { Linking, StyleSheet, View, ScrollView, Platform } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { Collapse } from '../components/Collapse';

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
    <ScrollView accessibilityLabel="app-root" style={styles.container}>
      <Collapse title="Accept a payment">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (single-step)"
              onPress={() => {
                navigation.navigate('PaymentsUICompleteScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (multi-step)"
              onPress={() => {
                navigation.navigate('PaymentsUICustom');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Card element only"
              onPress={() => {
                navigation.navigate('WebhookPayment');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="More payment scenarios">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Set up future payments"
              onPress={() => {
                navigation.navigate('SetupFuturePayment');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Finalize payments on the server"
              onPress={() => {
                navigation.navigate('NoWebhookPayment');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Recollect a CVC"
              onPress={() => {
                navigation.navigate('CVCReCollectionScreen');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="Bank Debits">
        <>
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
              title="SEPA Direct Debit set up"
              onPress={() => {
                navigation.navigate('SepaSetupFuturePaymentScreen');
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
              title="BECS Direct Debit set up"
              onPress={() => {
                navigation.navigate('AuBECSDebitSetupPaymentScreen');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="Bank redirects">
        <>
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
              title="Bancontact SEPA Direct Debit set up"
              onPress={() => {
                navigation.navigate('BancontactSetupFuturePaymentScreen');
              }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="EPS"
              onPress={() => {
                navigation.navigate('EPSPaymentScreen');
              }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="FPX"
              onPress={() => {
                navigation.navigate('FPXPaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="giropay"
              onPress={() => {
                navigation.navigate('GiropayPaymentScreen');
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
              title="iDEAL SEPA Direct Debit set up"
              onPress={() => {
                navigation.navigate('IdealSetupFuturePaymentScreen');
              }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Przelewy24"
              onPress={() => {
                navigation.navigate('P24PaymentScreen');
              }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Sofort"
              onPress={() => {
                navigation.navigate('SofortPaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Sofort SEPA Direct Debit set up"
              onPress={() => {
                navigation.navigate('SofortSetupFuturePaymentScreen');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="Buy now pay later">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Afterpay and Clearpay"
              onPress={() => {
                navigation.navigate('AfterpayClearpayPaymentScreen');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="Vouchers">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="OXXO"
              onPress={() => {
                navigation.navigate('OxxoPaymentScreen');
              }}
            />
          </View>
        </>
      </Collapse>

      <Collapse title="Wallets">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Alipay"
              onPress={() => {
                navigation.navigate('AlipayPaymentScreen');
              }}
            />
          </View>

          {Platform.OS === 'ios' && (
            <View style={styles.buttonContainer}>
              <Button
                title="Apple Pay"
                onPress={() => {
                  navigation.navigate('ApplePay');
                }}
              />
            </View>
          )}
          <View style={styles.buttonContainer}>
            <Button
              title="GrabPay"
              onPress={() => {
                navigation.navigate('GrabPayPaymentScreen');
              }}
            />
          </View>
        </>
      </Collapse>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
