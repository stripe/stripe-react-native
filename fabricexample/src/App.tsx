import * as React from 'react';

import { StyleSheet, Text, View } from 'react-native';
import { CardField, initStripe } from 'react-native-stripe-sdk';

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
        console.log(`🚀🚀🚀🚀🚀🚀🚀🚀 `, e);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>StripeSDK</Text>
      <CardField
        cardStyle={inputStyles}
        style={styles.cardField}
        postalCodeEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  or: {
    textAlign: 'center',
    marginTop: 30,
  },
});

const inputStyles = {
  borderWidth: 1,
  backgroundColor: '#FFFFFF',
  borderColor: '#000000',
  borderRadius: 8,
  fontSize: 14,
  placeholderColor: '#999999',
};
