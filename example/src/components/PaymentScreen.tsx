import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../colors';
import { fetchPublishableKey } from '../helpers';

interface Props {
  paymentMethod?: string;
  onInit?(): void;
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
          urlScheme:
            paymentMethod === 'wechat_pay' ? undefined : 'stripe-example',
          setUrlSchemeOnAndroid: true,
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
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={{ opacity: 0 }}>appium fix</Text>
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
