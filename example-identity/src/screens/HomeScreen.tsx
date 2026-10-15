import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  View,
  SafeAreaView,
  ScrollView,
  Text,
} from 'react-native';
import logo from '../assets/RocketRides.png';
import { getTestCredentials } from '../utils/api';
import { Options } from '../components/Options';
import { Identity } from '../components/Identity';
import { useAppThemeColors } from '../utils/theme';
import {
  AllowedTypes,
  PhoneOtpCheckTypes,
  VerificationSessionOptions,
  VerificationType,
} from '../types';

export function HomeScreen() {
  const colors = useAppThemeColors();

  const [options, setOptions] = useState<VerificationSessionOptions>({
    useTestMode: false,
    verificationType: VerificationType.DOCUMENT,
    requireMatchingSelfie: false,
    requireIdNumber: false,
    allowedTypes: {
      [AllowedTypes.DRIVING_LICENSE]: true,
      [AllowedTypes.ID_CARD]: true,
      [AllowedTypes.PASSPORT]: true,
    },
    requireLiveCapture: false,
    requireAddress: false,
    phoneFallbackToDocument: false,
    phoneOtpCheckType: PhoneOtpCheckTypes.ATTEMPT,
  });

  const fetchOptions = useCallback(async () => {
    const credentials = await getTestCredentials(options);
    return {
      sessionId: credentials.id,
      ephemeralKeySecret: credentials.ephemeral_key_secret,
      brandLogo: Image.resolveAssetSource(logo),
    };
  }, [options]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Stripe Identity
        </Text>
        <Options options={options} setOptions={setOptions} />
        <View
          style={[styles.divider, { borderBottomColor: colors.separator }]}
        />
        <Identity fetchOptions={fetchOptions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    marginHorizontal: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 16,
  },
  divider: {
    borderBottomWidth: 1,
  },
});
