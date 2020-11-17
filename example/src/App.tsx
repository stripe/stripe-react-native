import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import StripeSdk from 'react-native-stripe-sdk';

export default function App() {
  const { cardDetails } = StripeSdk.usePaymentMethod();

  console.log('cardDetails,', cardDetails);

  return (
    <View style={styles.container}>
      <Text>Result</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
