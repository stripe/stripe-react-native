import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../colors';
import { fetchPublishableKey } from '../helpers';

interface Props {
  paymentMethod?: string;
}

const threeD = {
  backgroundColor: '#FFFFFF', // iOS only
  timeout: 5,
  label: {
    headingTextColor: '#cfaa00',
    headingFontSize: 13,
  },
  navigationBar: {
    headerText: 'Complete card authentication',
    statusBarColor: '#cfaa00',
    backgroundColor: '#cd1231',
  },
  footer: {
    // iOS only
    backgroundColor: '#cfaa00',
    headingTextColor: '#cfaa00',
    textColor: '#cfaa00',
  },
  submitButton: {
    backgroundColor: '#cfaa00',
    borderRadius: 0,
    textColor: '#FFFFFF',
    textFontSize: 14,
  },
};

const PaymentScreen: React.FC<Props> = ({ paymentMethod, children }) => {
  useEffect(() => {
    async function initialize() {
      const publishableKey = await fetchPublishableKey(paymentMethod);
      if (publishableKey) {
        initStripe({
          publishableKey,
          urlScheme: 'stripe-example',
          threeDSecureParams: threeD,
        });
      }
    }
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.container}>
      {children}
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={{ opacity: 0 }}>appium fix</Text>
    </View>
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
