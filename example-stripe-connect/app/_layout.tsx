import { Stack, useRouter } from 'expo-router';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useSettings } from '../src/contexts/SettingsContext';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, Platform, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '../src/constants/colors';
import '../src/fonts/preloadedFonts'; // Load fonts at app startup

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const { publishableKey, viewControllerSettings } = useSettings();
  const [key, setKey] = useState<string>('');

  useEffect(() => {
    if (publishableKey) {
      setKey(publishableKey);
    }
  }, [publishableKey]);

  const componentPresentation =
    viewControllerSettings.presentationType === 'present_modally'
      ? 'modal'
      : 'card';

  const showComponentHeader =
    viewControllerSettings.embedInNavigationBar ||
    viewControllerSettings.presentationType === 'navigation_push';

  // For tabs, show header if embedInNavigationBar is true
  const showTabsHeader = viewControllerSettings.embedInNavigationBar;

  // Show close button for modal presentation
  const isModal = viewControllerSettings.presentationType === 'present_modally';

  const renderCloseButton = () => (
    <TouchableOpacity
      onPress={() => router.dismiss()}
      style={styles.headerButton}
    >
      {Platform.OS === 'ios' ? (
        <SymbolView
          name="xmark"
          size={22}
          tintColor={Colors.icon.primary}
          style={styles.symbolView}
        />
      ) : (
        <Text style={styles.headerIcon}>✕</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <StripeProvider publishableKey={key || 'pk_test_placeholder'}>
      <Stack
        screenOptions={{
          headerTransparent: Platform.select({ ios: true, default: false }),
          headerBlurEffect: 'systemChromeMaterial',
          headerBackButtonDisplayMode: 'minimal',
          headerLargeStyle: {
            backgroundColor: 'transparent',
          },
          headerStyle: Platform.select({
            ios: { backgroundColor: 'transparent' },
            default: {},
          }),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: true }} />
        <Stack.Screen
          name="account-onboarding"
          options={{
            title: 'Account Onboarding',
            presentation: componentPresentation,
            headerShown: showComponentHeader,
            headerLeft:
              isModal && showComponentHeader ? renderCloseButton : undefined,
          }}
        />
        <Stack.Screen
          name="payments"
          options={{
            title: 'Payments',
            presentation: componentPresentation,
            headerShown: showComponentHeader,
            headerLeft:
              isModal && showComponentHeader ? renderCloseButton : undefined,
          }}
        />
        <Stack.Screen
          name="payouts"
          options={{
            title: 'Payouts',
            presentation: componentPresentation,
            headerShown: showComponentHeader,
            headerLeft:
              isModal && showComponentHeader ? renderCloseButton : undefined,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            title: 'Components',
            presentation: componentPresentation,
            headerShown: showTabsHeader,
            headerLeft:
              isModal && showTabsHeader ? renderCloseButton : undefined,
          }}
        />
        <Stack.Screen
          name="(settings)"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="configure-appearance"
          options={{
            title: 'Configure Appearance',
            presentation: 'modal',
          }}
        />
      </Stack>
    </StripeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <SettingsProvider>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </SettingsProvider>
      </KeyboardProvider>
    </QueryClientProvider>
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
