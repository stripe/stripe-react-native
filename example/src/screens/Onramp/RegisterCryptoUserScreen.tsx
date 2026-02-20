import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TextInput } from 'react-native';
import { colors } from '../../colors';
import Button from '../../components/Button';
import { useOnramp } from '@stripe/stripe-react-native';

export default function RegisterCryptoOnrampScreen() {
  const { registerLinkUser, updatePhoneNumber } = useOnramp();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [fullName, setFullName] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [didRegister, setDidRegister] = useState(false);

  const registerUser = useCallback(async () => {
    setResponse(null);
    setDidRegister(false);
    const userInfo = {
      email,
      phone,
      country,
      fullName: fullName || undefined,
    };
    const registerResult = await registerLinkUser(userInfo);
    if (registerResult?.error) {
      setResponse(
        `Error: ${registerResult.error.message || 'An error occurred while registering link user.'}`
      );
    } else {
      setResponse(`Registration Successful: ${registerResult.customerId}`);
      setDidRegister(true);
    }
  }, [email, phone, country, fullName, registerLinkUser]);

  const updatePhone = useCallback(async () => {
    setResponse(null);
    if (!newPhone.trim()) {
      setResponse('Please enter a phone number');
      return;
    }

    const updateResult = await updatePhoneNumber(newPhone);
    if (updateResult?.error) {
      setResponse(
        `Error: ${updateResult.error.message || 'An error occurred while updating phone number.'}`
      );
    } else {
      setResponse('Phone number updated successfully');
    }
  }, [newPhone, updatePhoneNumber]);

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
      </View>

      {didRegister && (
        <View style={styles.phoneUpdateContainer}>
          <Text style={styles.infoText}>Update Phone Number:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="New phone number (e.g., +12125551234)"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Button
            variant="primary"
            title="Update Phone Number"
            onPress={updatePhone}
          />
        </View>
      )}

      {response && <Text style={styles.responseText}>{response}</Text>}
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
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  responseText: {
    paddingHorizontal: 16,
    marginTop: 12,
    color: colors.dark_gray,
  },
  phoneUpdateContainer: {
    padding: 16,
  },
});
