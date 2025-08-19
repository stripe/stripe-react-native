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
  const { lookupLinkUser, presentOnrampVerificationFlow } = useStripe();
  const [email, setEmail] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState<boolean | null>(false);

  const checkIsLinkUser = useCallback(async () => {
    setResponse(null);
    try {
      const result = await lookupLinkUser(email);
      const verified = result?.isLinkUser ?? false;
      setIsLinkUser(verified);
      setResponse(`Is Link User: ${verified}`);
    } catch (error: any) {
      setResponse(
        `Error: ${error?.message || 'An error occurred while checking link user.'}`
      );
    }
  }, [email, lookupLinkUser]);

  const handlePresentVerification = useCallback(async () => {
    try {
      await presentOnrampVerificationFlow();
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
          editable={!isLinkUser}
        />

        <View style={styles.buttonContainer}>
          {response && <Text style={styles.responseText}>{response}</Text>}
        </View>

        {isLinkUser === false && (
          <Button title="Verify Link User" onPress={checkIsLinkUser} />
        )}

        {isLinkUser === true && (
          <Button
            title="Authenticate Link User"
            onPress={handlePresentVerification}
          />
        )}
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
  responseText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.dark_gray,
  },
});
