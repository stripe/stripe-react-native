import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function SettingsLayout() {
  return (
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
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen
        name="onboarding-settings"
        options={{ title: 'Onboarding Settings' }}
      />
      <Stack.Screen
        name="payments-filter-settings"
        options={{ title: 'Payments Filter Settings' }}
      />
      <Stack.Screen
        name="view-controller-options"
        options={{ title: 'View Controller Options' }}
      />
    </Stack>
  );
}
