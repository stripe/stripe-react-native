import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, TextInput } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useStripe } from '@stripe/stripe-react-native';

export default function VerifyCryptoLinkUserScreen() {
  const { configureOnramp, lookupLinkUser } = useStripe();
  const [email, setEmail] = useState('');
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    const config = {
      merchantDisplayName: 'Onramp RN Example',
      publishableKey:
        'pk_test_51K9W3OHMaDsveWq0oLP0ZjldetyfHIqyJcz27k2BpMGHxu9v9Cei2tofzoHncPyk3A49jMkFEgTOBQyAMTUffRLa00xzzARtZO',
      appearance: {
        lightColors: {
          primary: 0xff6200ee,
          borderSelected: 0xff03dac6,
        },
        darkColors: {
          primary: 0xffbb86fc,
          borderSelected: 0xff3700b3,
        },
        style: 'ALWAYS_DARK',
        primaryButton: {
          cornerRadiusDp: 8,
          heightDp: 48,
        },
      },
    };

    configureOnramp(config).catch(() => {});
  }, [configureOnramp]);

  const checkIsLinkUser = useCallback(async () => {
    setResponse(null);
    try {
      const result = await lookupLinkUser(email);
      const isLinkUser = result?.isLinkUser ?? false;
      setResponse(`Is Link User: ${isLinkUser}`);
    } catch (error: any) {
      setResponse(
        `Error: ${error?.message || 'An error occurred while checking link user.'}`
      );
    }
  }, [email, lookupLinkUser]);

  return (
    <ScrollView
      accessibilityLabel="verify-link-user-root"
      style={styles.container}
    >
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
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Check Link User" onPress={checkIsLinkUser} />
        {response && <Text style={styles.responseText}>{response}</Text>}
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
