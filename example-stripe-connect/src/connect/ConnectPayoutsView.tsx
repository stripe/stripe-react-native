import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from '../screens/ConnectScreen';
import FloatingBackButton from '../components/FloatingBackButton';

export default function ConnectPayoutsView() {
  return (
    <ConnectScreen>
      <View style={styles.container}>
        <FloatingBackButton />
        <ConnectPayouts
          onLoadError={(err) => {
            Alert.alert('Error', err.error.message);
          }}
        />
      </View>
    </ConnectScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
