import * as React from 'react';

import { Button, StyleSheet, Text, View } from 'react-native';
import { CardField, initStripe } from '@stripe/stripe-react-native';
import type { CardFieldInput } from '@stripe/stripe-react-native';

export default function App() {
  const ref = React.useRef<CardFieldInput.Methods>(null);

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
        console.log(`JUST IGNORE IT `);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>StripeSDK</Text>
      <CardField
        ref={ref}
        cardStyle={inputStyles}
        style={styles.cardField}
        postalCodeEnabled={false}
        onCardChange={(e) => {
          console.log(`🚀🚀🚀🚀🚀🚀🚀🚀 `, e);
        }}
        onFocus={(e) => {
          console.log(`🚀🚀🚀🚀🚀🚀🚀🚀 `, e);
        }}
      />
      <Button
        onPress={() => {
          ref.current?.focus();
        }}
        title="focus"
      />
      <Button
        onPress={() => {
          ref.current?.clear();
        }}
        title="clear"
      />
      <Button
        onPress={() => {
          ref.current?.blur();
        }}
        title="blur"
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
