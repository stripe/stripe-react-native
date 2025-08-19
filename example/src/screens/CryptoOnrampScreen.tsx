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
  const { presentOnrampVerificationFlow } = useStripe();
  const [email, setEmail] = useState('');

  const handlePresentVerification = useCallback(async () => {
    try {
      await presentOnrampVerificationFlow();
      Alert.alert('Success', 'Verification flow presented.');
    } catch (error) {
      console.error('Error presenting verification flow:', error);
      Alert.alert('Error', 'Could not present verification flow.');
    }
  }, [presentOnrampVerificationFlow]);

  return (
    <ScrollView accessibilityLabel="onramp-flow" style={styles.container}>
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
        <Button
          title="Authenticate Link User"
          onPress={handlePresentVerification}
        />
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
