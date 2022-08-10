import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import {
  Linking,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { Collapse } from '../components/Collapse';

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

    getUrlAsync();

    const deepLinkListener = Linking.addEventListener(
      'url',
      (event: { url: string }) => {
        handleDeepLink(event.url);
      }
    );

    return () => deepLinkListener.remove();
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
              title="Prebuilt UI for Subscription"
              onPress={() => {
                navigation.navigate('PaymentSheetWithSetupIntent');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (multi-step)"
              onPress={() => {
                navigation.navigate('PaymentsUICustomScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Card element only"
              onPress={() => {
                navigation.navigate('WebhookPaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Multiline Card element only"
              onPress={() => {
                navigation.navigate('MultilineWebhookPaymentScreen');
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
                navigation.navigate('SetupFuturePaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Finalize payments on the server"
              onPress={() => {
                navigation.navigate('NoWebhookPaymentScreen');
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
          <View style={styles.buttonContainer}>
            <Button
              title="Create tokens"
              onPress={() => {
                navigation.navigate('CreateTokenScreen');
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
          <View style={styles.buttonContainer}>
            <Button
              title="ACH payment"
              onPress={() => {
                navigation.navigate('ACHPaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="ACH setup"
              onPress={() => {
                navigation.navigate('ACHSetupScreen');
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
                navigation.navigate('IdealPaymentScreen');
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
          <View style={styles.buttonContainer}>
            <Button
              title="Klarna"
              onPress={() => {
                navigation.navigate('KlarnaPaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Affirm"
              onPress={() => {
                navigation.navigate('AffirmScreen');
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
                  navigation.navigate('ApplePayScreen');
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

          {Platform.OS === 'android' && (
            <View style={styles.buttonContainer}>
              <Button
                title="Google Pay"
                onPress={() => {
                  navigation.navigate('GooglePayScreen');
                }}
              />
            </View>
          )}
          <View style={styles.buttonContainer}>
            <Button
              title="PayPal"
              onPress={() => {
                navigation.navigate('PayPalScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="WeChat Pay"
              onPress={() => {
                // navigation.navigate('WeChatPaymentScreen');
                Alert.alert('WeChat Pay is not yet supported.');
              }}
            />
          </View>
        </>
      </Collapse>
      <Collapse title="Financial Connections">
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Collect Bank Account"
              onPress={() => {
                navigation.navigate('CollectBankAccountScreen');
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
