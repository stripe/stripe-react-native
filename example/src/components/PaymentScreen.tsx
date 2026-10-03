import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../colors';
import { fetchPublishableKey } from '../helpers';

interface Props {
  paymentMethod?: string;
  onInit?(): void;
  children?: React.ReactNode;
}

const PaymentScreen: React.FC<Props> = ({
  paymentMethod,
  children,
  onInit,
}) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      const publishableKey = await fetchPublishableKey(paymentMethod);
      if (publishableKey) {
        await initStripe({
          publishableKey,
          merchantIdentifier: 'merchant.com.stripe.react.native',
          urlScheme: 'com.stripe.react.native',
          // For Pay by Bank, leave the Android return URL unset so stripe-android's
          // DefaultReturnUrl and StripeBrowserProxyReturnActivity can relay the Custom Tab
          // result back to PaymentLauncher. Setting this routes `urlScheme://safepay`
          // directly to the React Native activity and bypasses that relay.
          setReturnUrlSchemeOnAndroid: paymentMethod !== 'pay_by_bank',
        });
        setLoading(false);
        onInit?.();
      }
    }
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return loading ? (
    <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  ) : (
    <ScrollView
      accessibilityLabel="payment-screen"
      style={styles.container}
      keyboardShouldPersistTaps="always"
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
});

export default PaymentScreen;
