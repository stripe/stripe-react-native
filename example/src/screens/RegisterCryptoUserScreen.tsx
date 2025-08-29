import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TextInput } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useOnramp } from '@stripe/stripe-react-native';

export default function RegisterCryptoOnrampScreen() {
  const { registerLinkUser } = useOnramp();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [fullName, setFullName] = useState('');
  const [response, setResponse] = useState<string | null>(null);

  const registerUser = useCallback(async () => {
    setResponse(null);
    const userInfo = {
      email,
      phone,
      country,
      fullName: fullName || undefined,
    };
    const result = await registerLinkUser(userInfo);
    if (result?.error) {
      setResponse(
        `Error: ${result.error.message || 'An error occurred while registering link user.'}`
      );
    } else {
      setResponse(`Registration Successful: ${result.customerId}`);
    }
  }, [email, phone, country, fullName, registerLinkUser]);

  return (
    <ScrollView
      accessibilityLabel="register-crypto-user-screen"
      style={styles.container}
    >
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
        <Button
          variant="primary"
          title="Register Link User"
          onPress={registerUser}
        />
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
  infoText: {},
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  responseText: {
    marginTop: 12,
    color: colors.dark_gray,
  },
});
