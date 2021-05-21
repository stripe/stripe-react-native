import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  requireNativeComponent,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { colors } from '../colors';
import { fetchPublishableKey } from '../helpers';

interface Props {
  paymentMethod?: string;
}

const StripeContainerNative = requireNativeComponent<any>('StripeContainer');

const PaymentScreen: React.FC<Props> = ({ paymentMethod, children }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      const publishableKey = await fetchPublishableKey(paymentMethod);
      if (publishableKey) {
        await initStripe({
          publishableKey,
          merchantIdentifier: 'merchant.com.stripe.react.native',
          urlScheme: 'stripe-example',
          setUrlSchemeOnAndroid: true,
        });
        setLoading(false);
      }
    }
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return loading ? (
    <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  ) : (
    <StripeContainerNative style={styles.container}>
      <ScrollView
        accessibilityLabel="payment-screen"
        keyboardShouldPersistTaps="always"
        style={styles.container}
      >
        {children}
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={{ opacity: 0 }}>appium fix</Text>
      </ScrollView>
    </StripeContainerNative>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 0,
  },
});

export default PaymentScreen;
