import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSettings } from '../src/contexts/SettingsContext';
import { Colors } from '../src/constants/colors';
import ConnectAccountOnboardingView from '../src/connect/ConnectAccountOnboardingView';

export default function AccountOnboardingScreen() {
  const router = useRouter();
  const { viewControllerSettings } = useSettings();

  const isModal = viewControllerSettings.presentationType === 'present_modally';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Account Onboarding',
          headerLeft: isModal
            ? () => (
                <TouchableOpacity
                  onPress={() => router.dismiss()}
                  style={styles.headerButton}
                >
                  {Platform.OS === 'ios' ? (
                    <SymbolView
                      name="xmark"
                      size={20}
                      tintColor={Colors.icon.primary}
                      style={styles.symbolView}
                    />
                  ) : (
                    <Text style={styles.headerIcon}>✕</Text>
                  )}
                </TouchableOpacity>
              )
            : undefined,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/configure-appearance')}
              style={styles.headerButton}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name="paintpalette"
                  size={22}
                  tintColor={Colors.icon.primary}
                  style={styles.symbolView}
                />
              ) : (
                <Text style={styles.headerIcon}>🎨</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ConnectAccountOnboardingView />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
  },
  symbolView: {
    width: 22,
    height: 22,
  },
  headerIcon: {
    fontSize: 24,
  },
});
