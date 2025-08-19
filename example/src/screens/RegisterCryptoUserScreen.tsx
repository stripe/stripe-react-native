import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, TextInput } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useStripe } from '@stripe/stripe-react-native';

export default function CryptoOnrampScreen() {
  const { configureOnramp, registerLinkUser } = useStripe();
  // State for LinkUserInfo fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [fullName, setFullName] = useState('');
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    const config = {
      merchantDisplayName: 'Onramp RN Example',
      publishableKey:
        'pk_test_51K9W3OHMaDsveWq0oLP0ZjldetyfHIqyJcz27k2BpMGHxu9v9Cei2tofzoHncPyk3A49jMkFEgTOBQyAMTUffRLa00xzzARtZO',
      appearance: {
        lightColors: {
          primary: 0xff6200ee, // Example: purple
          borderSelected: 0xff03dac6, // Example: teal
        },
        darkColors: {
          primary: 0xffbb86fc, // Example: light purple
          borderSelected: 0xff3700b3, // Example: dark purple
        },
        style: 'ALWAYS_DARK', // or "ALWAYS_LIGHT", "ALWAYS_DARK"
        primaryButton: {
          cornerRadiusDp: 8,
          heightDp: 48,
        },
      },
    };

    configureOnramp(config)
      .then(() => {
        console.error('Onramp configured successfully.');
      })
      .catch((error: any) => {
        console.error('Error configuring Onramp:', error);
      });
  }, [configureOnramp]);

  const registerUser = useCallback(async () => {
    setResponse(null);
    try {
      const userInfo = {
        email,
        phone,
        country,
        fullName: fullName || undefined,
      };
      const result = await registerLinkUser(userInfo);
      setResponse(`Registration Successful: ${JSON.stringify(result)}`);
    } catch (error: any) {
      setResponse(
        `Error: ${error?.message || 'An error occurred while registering link user.'}`
      );
    }
  }, [email, phone, country, fullName, registerLinkUser]);

  return (
    <ScrollView accessibilityLabel="onramp-root" style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Enter your user information:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.textInput}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.textInput}
          placeholder="Country"
          value={country}
          onChangeText={setCountry}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.textInput}
          placeholder="Full Name (optional)"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Register Link User" onPress={registerUser} />
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
