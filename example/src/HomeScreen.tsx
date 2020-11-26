import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Button, Text, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>React Native Stripe SDK</Text>
      <Button
        title="Card payment using webhooks"
        onPress={() => {
          navigation.navigate('WebhookPayment');
        }}
      />
      <Button
        title="Card payment without webhooks"
        onPress={() => {
          navigation.navigate('NoWebhookPayment');
        }}
      />
      <Button
        title="Apple Pay payment"
        onPress={() => {
          navigation.navigate('ApplePay');
        }}
      />
    </View>
  );
}
