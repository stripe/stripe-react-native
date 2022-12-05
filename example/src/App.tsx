import * as React from 'react';

import { StyleSheet, View, Text } from 'react-native';
import { initStripe } from 'react-native-stripe-sdk';

export default function App() {
  React.useEffect(() => {
    (async function () {
      try {
        await initStripe({
          publishableKey: '',
          merchantIdentifier: 'merchant.com.stripe.react.native',
          urlScheme: 'stripe-example',
          setReturnUrlSchemeOnAndroid: true,
        });
      } catch (e) {
        console.log(`Please provide a publishableKey`);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>StripeSDK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
