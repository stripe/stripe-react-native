import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  StripeProvider,
  useStripe,
  useOnramp,
} from '@stripe/stripe-react-native';
import {
  Linking,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Alert,
  Text,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { Collapse } from '../components/Collapse';
import { Onramp } from '@stripe/stripe-react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { handleURLCallback } = useStripe();
  const { configure } = useOnramp();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url) {
        const stripeHandled = await handleURLCallback(url);
        if (stripeHandled) {
          navigation.navigate('PaymentResultScreen', { url });
        }
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

  const handleConfigureOnramp = useCallback(() => {
    const config: Onramp.Configuration = {
      merchantDisplayName: 'Onramp RN Example',
      appearance: {
        lightColors: {
          primary: '#2d22a1',
          contentOnPrimary: '#ffffff',
          borderSelected: '#07b8b8',
        },
        darkColors: {
          primary: '#800080',
          contentOnPrimary: '#ffffff',
          borderSelected: '#526f3e',
        },
        style: 'ALWAYS_DARK',
        primaryButton: {
          cornerRadius: 8,
          height: 48,
        },
      },
    };

    configure(config).then((result) => {
      if (result?.error) {
        console.error('Error configuring Onramp:', result.error.message);
        Alert.alert('Onramp Configuration Error', result.error.message);
      } else {
        console.log('Onramp configured successfully.');
        Alert.alert('Success', 'Onramp configured successfully.');
      }
    });
  }, [configure]);

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
              title="Prebuilt UI (deferred intent)"
              onPress={() => {
                navigation.navigate('PaymentSheetDeferredIntentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (multi-step) (deferred intent)"
              onPress={() => {
                navigation.navigate(
                  'PaymentSheetDeferredIntentMultiStepScreen'
                );
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (EmbeddedPaymentElement)"
              onPress={() => {
                navigation.navigate('EmbeddedPaymentElementScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Prebuilt UI (EmbeddedPaymentElement - immediateAction rowSelectionBehavior)"
              onPress={() => {
                navigation.navigate(
                  'EmbeddedPaymentElementImmediateActionScreen'
                );
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Customer Sheet"
              onPress={() => {
                navigation.navigate('CustomerSheetScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Customer Sheet with Customer Session"
              onPress={() => {
                navigation.navigate('CustomerSheetScreenCustomerSession');
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
              title="Finalize setup on the server"
              onPress={() => {
                navigation.navigate('NoWebhookSetupScreen');
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
          <View style={styles.buttonContainer}>
            <Button
              title="PaymentSheet with PMO SFU"
              onPress={() => {
                navigation.navigate('PaymentSheetWithPmoSfuScreen');
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
              title="Billie"
              onPress={() => {
                navigation.navigate('BilliePaymentScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Alma"
              onPress={() => {
                navigation.navigate('AlmaPaymentScreen');
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
              title="CashApp"
              onPress={() => {
                navigation.navigate('CashAppScreen');
              }}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="RevolutPay"
              onPress={() => {
                navigation.navigate('RevolutPayScreen');
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
      <Collapse title="Connect embedded components">
        <View style={styles.buttonContainer}>
          <Button
            title="Account onboarding"
            onPress={() => {
              navigation.navigate('ConnectAccountOnboardingScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Payments list"
            onPress={() => {
              navigation.navigate('ConnectPaymentsListScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Payouts list"
            onPress={() => {
              navigation.navigate('ConnectPayoutsListScreen');
            }}
          />
        </View>
      </Collapse>
      <StripeProvider
        publishableKey="pk_test_51K9W3OHMaDsveWq0oLP0ZjldetyfHIqyJcz27k2BpMGHxu9v9Cei2tofzoHncPyk3A49jMkFEgTOBQyAMTUffRLa00xzzARtZO"
        merchantIdentifier="merchant.com.stripe.react.native"
      >
        <Collapse title="Crypto Onramp">
          <>
            <View style={styles.buttonContainer}>
              <Button
                title="Configure Onramp (Required First)"
                onPress={() => {
                  handleConfigureOnramp();
                }}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button
                title="Crypto Onramp Flow"
                onPress={() => {
                  navigation.navigate('CryptoOnrampFlow');
                }}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button
                title="Register Crypto Link User"
                onPress={() => {
                  navigation.navigate('RegisterCryptoUserScreen');
                }}
              />
            </View>
          </>
        </Collapse>
        <Collapse title="Payment Method Messaging Element">
          <>
            <View style={styles.buttonContainer}>
              <Button
                title="PMME"
                onPress={() => {
                  navigation.navigate('PaymentMethodMessagingElementScreen');
                }}
              />
            </View>
          </>
        </Collapse>
      </StripeProvider>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          New arch enabled:{' '}
          {(global as any).nativeFabricUIManager ? 'true' : 'false'}
        </Text>
        <Text style={styles.infoText}>
          Bridgeless enabled: {(global as any).RN$Bridgeless ? 'true' : 'false'}
        </Text>
      </View>
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
  infoContainer: {
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
});
