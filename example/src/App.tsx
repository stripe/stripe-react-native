import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import StripeSdk, { StripeProvider } from 'react-native-stripe-sdk';

// Address to stripe server running on local machine
const API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4242' : 'http://localhost:4242';

export default function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const response = await fetch(`${API_URL}/stripe-key`);
    const { publishableKey: key } = await response.json();
    setPublishableKey(key);
  };

  console.log('StripeSdk,', StripeSdk);

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  return (
    <StripeProvider publishableKey={publishableKey}>
      <StripeSdk.CardFieldNative
        postalCodeEnabled={true}
        onCardChange={(card) => {
          console.log('card details', card.nativeEvent);
        }}
        style={styles.cardField}
      />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  cardField: {
    marginTop: 300,
    width: '100%',
    height: 50,
  },
});
