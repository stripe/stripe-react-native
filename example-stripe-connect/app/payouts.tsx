import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from '../src/screens/ConnectScreen';
import { useSettings } from '../src/contexts/SettingsContext';
import { Colors } from '../src/constants/colors';

export default function PayoutsScreen() {
  const router = useRouter();
  const { viewControllerSettings } = useSettings();

  const isModal = viewControllerSettings.presentationType === 'present_modally';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payouts',
          headerLeft: isModal
            ? () => (
                <TouchableOpacity
                  onPress={() => router.back()}
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
      <ConnectScreen>
        <ConnectPayouts
          onLoadError={(err) => {
            Alert.alert('Error', err.error.message);
          }}
        />
      </ConnectScreen>
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
