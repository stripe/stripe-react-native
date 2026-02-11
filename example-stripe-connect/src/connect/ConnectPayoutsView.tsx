import { ConnectPayouts } from '@stripe/stripe-react-native';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import ConnectScreen from '../screens/ConnectScreen';

export default function ConnectPayoutsView() {
  return (
    <ConnectScreen>
      <View style={styles.container}>
        <ConnectPayouts
          style={styles.component}
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
  component: {
    paddingTop: 26, // applies when there's no navigation bar and the comopnent is presented in a modal
  },
});
