import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  TextInput,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useStripe } from '@stripe/stripe-react-native';

export default function CryptoOnrampScreen() {
  const { lookupLinkUser } = useStripe();
  const [email, setEmail] = useState('');

  const checkIsLinkUser = useCallback(async () => {
    try {
      const result = await lookupLinkUser(email);
      const isLinkUser = result?.isLinkUser ?? false;
      Alert.alert('Result', `Is Link User: ${isLinkUser}`);
    } catch (error) {
      console.error('Error checking link user:', error);
      Alert.alert('Error', 'An error occurred while checking link user.');
    }
  }, [email, lookupLinkUser]);

  return (
    <ScrollView accessibilityLabel="onramp-root" style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Enter your email address:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button title="Check Link User" onPress={checkIsLinkUser} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoContainer: {
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
});
