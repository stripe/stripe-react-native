import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import Screen from '../components/Screen';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <Screen>
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
      {Platform.OS === 'ios' && (
        <View style={styles.buttonContainer}>
          <Button
            title="Apple Pay payment"
            onPress={() => {
              navigation.navigate('ApplePay');
            }}
          />
        </View>
      )}
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
          title="Re-collect CVC"
          onPress={() => {
            navigation.navigate('CVCReCollectionScreen');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
