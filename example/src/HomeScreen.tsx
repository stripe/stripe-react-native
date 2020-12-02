import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          title="Card payment using webhooks"
          onPress={() => {
            navigation.navigate('WebhookPayment');
          }}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Card payment without webhooks"
          onPress={() => {
            navigation.navigate('NoWebhookPayment');
          }}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Apple Pay payment"
          onPress={() => {
            navigation.navigate('ApplePay');
          }}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Setup Future Payment"
          onPress={() => {
            navigation.navigate('SetupFuturePayment');
          }}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="3d Secure configuration"
          onPress={() => {
            navigation.navigate('ThreeDSecureScreen');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
