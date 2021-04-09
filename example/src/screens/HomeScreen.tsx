import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { Linking, StyleSheet, View, ScrollView } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import Screen from '../components/Screen';

export type RootStackParamList = {
  PaymentResultScreen: { url: string };
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { handleURLCallback } = useStripe();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url && url.includes('safepay')) {
        await handleURLCallback(url);
        navigation.navigate('PaymentResultScreen', { url });
      }
    },
    [navigation, handleURLCallback]
  );

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    const urlCallback = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    getUrlAsync();

    Linking.addEventListener('url', urlCallback);

    return () => Linking.removeEventListener('url', urlCallback);
  }, [handleDeepLink]);

  return (
    <Screen>
      <ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            title="Payments UI Complete"
            onPress={() => {
              navigation.navigate('PaymentsUICompleteScreen');
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Payments UI Custom integration"
            onPress={() => {
              navigation.navigate('PaymentsUICustom');
            }}
          />
        </View>
      </ScrollView>
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
