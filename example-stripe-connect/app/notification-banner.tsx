import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import ConnectNotificationBannerView from '../src/connect/ConnectNotificationBannerView';
import { Colors } from '../src/constants/colors';

export default function NotificationBannerScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notification banner',
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
      <ConnectNotificationBannerView />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  symbolView: {
    width: 22,
    height: 22,
  },
});
