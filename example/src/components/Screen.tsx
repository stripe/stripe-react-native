import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../colors';
import { fetchPublishableKey } from '../helpers';

interface Props {
  init?: boolean;
  paymentMethod?: string;
}

const Screen: React.FC<Props> = ({ paymentMethod, init, children }) => {
  useEffect(() => {
    async function initialize() {
      const publishableKey = await fetchPublishableKey(paymentMethod);
      initStripe({ publishableKey, urlScheme: 'stripe-example' });
    }
    if (init) {
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
});

export default Screen;
