import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../../colors';
import Button from '../../components/Button';
import { useOnramp, useStripe, PlatformPay } from '@stripe/stripe-react-native';

export default function RegisterCryptoOnrampScreen() {
  const { registerLinkUser, updatePhoneNumber, collectPaymentMethod } =
    useOnramp();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [fullName, setFullName] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [didRegister, setDidRegister] = useState(false);
  const { isPlatformPaySupported } = useStripe();
  const [collectingContact, setCollectingContact] = useState(false);

  const collectContact = async () => {
    setCollectingContact(true);
    try {
      if (!(await isPlatformPaySupported({ googlePay: { testEnv: true } }))) {
        setResponse('Platform Pay is unavailable on this device.');
        return;
      }
      const result = await collectPaymentMethod(
        'PlatformPay',
        Platform.OS === 'ios'
          ? {
              applePay: {
                merchantCountryCode: 'US',
                currencyCode: 'USD',
                cartItems: [
                  {
                    label: 'Example',
                    amount: '1.00',
                    paymentType: PlatformPay.PaymentType.Immediate,
                  },
                ],
                requiredBillingContactFields: [
                  PlatformPay.ContactField.Name,
                  PlatformPay.ContactField.PostalAddress,
                ],
                requiredShippingAddressFields: [
                  PlatformPay.ContactField.EmailAddress,
                  PlatformPay.ContactField.PhoneNumber,
                ],
              },
            }
          : {
              googlePay: { currencyCode: 'USD', amount: 100, label: 'Example' },
            }
      );
      if (result.error) {
        setResponse(result.error.message);
        return;
      }
      const info = result.kycInfo;
      if (!info) {
        setResponse(
          'No contact details were returned. Enter your details below.'
        );
        return;
      }
      if (info.email) setEmail(info.email);
      if (info.phone) setPhone(info.phone);
      if (info.address?.country) setCountry(info.address.country);
      const name = [info.firstName, info.lastName].filter(Boolean).join(' ');
      if (name) setFullName(name);
      if (!info.phone && info.rawPhone) {
        Alert.alert(
          'Check phone number',
          `Wallet phone: ${info.rawPhone}. Enter this number in E.164 format, including its country code.`
        );
      }
      setResponse(
        'Review the collected details and complete any missing fields before registering.'
      );
    } catch (error) {
      setResponse(String(error));
    } finally {
      setCollectingContact(false);
    }
  };

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
        <Button
          title={
            collectingContact
              ? 'Collecting details...'
              : 'Prefill from Platform Pay'
          }
          onPress={collectContact}
          disabled={collectingContact}
        />
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
