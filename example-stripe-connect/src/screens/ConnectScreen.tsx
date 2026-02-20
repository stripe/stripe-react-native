import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ConnectComponentsProvider,
  loadConnectAndInitialize,
  StripeConnectInstance,
} from '@stripe/stripe-react-native';
import { useSettings } from '../contexts/SettingsContext';
import { createAPIClient } from '../api/StripeConnectAPI';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
import { Colors } from '../constants/colors';
import { getCustomFont } from '../fonts/preloadedFonts';

interface Props {
  children?: React.ReactNode;
}

const ConnectScreen: React.FC<Props> = ({ children }) => {
  const { publishableKey, selectedMerchant, backendUrl, appearancePreset } =
    useSettings();

  const customFont = getCustomFont();

  const [stripeConnectInstance, setStripeConnectInstance] =
    useState<StripeConnectInstance>();

  useEffect(() => {
    if (!publishableKey) {
      return;
    }

    // Create fetchClientSecret function that uses our API
    const fetchClientSecret = async () => {
      const apiClient = createAPIClient(backendUrl);
      const response = await apiClient.accountSession(
        selectedMerchant?.merchant_id
      );
      return response.client_secret;
    };

    // Get appearance variables based on selected preset
    const appearanceVariables = APPEARANCE_PRESETS[appearancePreset] || {};

    // Initialize Stripe Connect
    const instance = loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        variables: appearanceVariables,
      },
      fonts: customFont ? [customFont] : undefined,
    });

    setStripeConnectInstance(instance);
  }, [
    publishableKey,
    selectedMerchant?.merchant_id,
    backendUrl,
    appearancePreset,
    customFont,
  ]);

  // Update appearance when preset changes
  useEffect(() => {
    if (stripeConnectInstance) {
      const appearanceVariables = APPEARANCE_PRESETS[appearancePreset] || {};
      stripeConnectInstance.update({
        appearance: {
          variables: appearanceVariables,
        },
      });
    }
  }, [stripeConnectInstance, appearancePreset]);

  if (!stripeConnectInstance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {children}
      </SafeAreaView>
    </ConnectComponentsProvider>
  );
};

export default ConnectScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
});
