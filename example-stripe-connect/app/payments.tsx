import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSettings } from '../src/contexts/SettingsContext';
import { useAppearanceTextColor } from '../src/hooks/useAppearanceTextColor';
import ConnectPaymentsView from '../src/connect/ConnectPaymentsView';

export default function PaymentsScreen() {
  const router = useRouter();
  const { viewControllerSettings } = useSettings();
  const textColor = useAppearanceTextColor();

  const isModal = viewControllerSettings.presentationType === 'present_modally';
  const showHeader = viewControllerSettings.embedInNavigationBar;

  return (
    <>
      <Stack.Screen
        options={{
          title: showHeader ? 'Payments' : '',
          headerTintColor: textColor,
          headerLeft:
            isModal && showHeader
              ? () => (
                  <TouchableOpacity
                    onPress={() => router.dismiss()}
                    style={styles.headerButton}
                  >
                    {Platform.OS === 'ios' ? (
                      <SymbolView
                        name="xmark"
                        size={20}
                        tintColor={textColor}
                        style={styles.symbolView}
                      />
                    ) : (
                      <Text style={[styles.headerIcon, { color: textColor }]}>
                        ✕
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              : undefined,
          headerRight: showHeader
            ? () => (
                <TouchableOpacity
                  onPress={() => router.push('/configure-appearance')}
                  style={styles.headerButton}
                >
                  {Platform.OS === 'ios' ? (
                    <SymbolView
                      name="paintpalette"
                      size={22}
                      tintColor={textColor}
                      style={styles.symbolView}
                    />
                  ) : (
                    <Text style={styles.headerIcon}>🎨</Text>
                  )}
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <ConnectPaymentsView />
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
