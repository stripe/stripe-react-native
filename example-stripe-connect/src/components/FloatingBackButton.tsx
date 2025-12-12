import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSettings } from '../contexts/SettingsContext';
import { Colors } from '../constants/colors';

export default function FloatingBackButton() {
  const router = useRouter();
  const { viewControllerSettings } = useSettings();

  const showBackButton =
    viewControllerSettings.presentationType === 'navigation_push' &&
    !viewControllerSettings.embedInNavigationBar;

  if (!showBackButton) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      {Platform.OS === 'ios' ? (
        <SymbolView
          name="chevron.left"
          size={24}
          tintColor={Colors.icon.primary}
          style={styles.symbolView}
        />
      ) : (
        <Text style={styles.backButtonText}>←</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    zIndex: 1000,
    padding: 8,
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.icon.primary,
  },
  symbolView: {
    width: 24,
    height: 24,
  },
});
