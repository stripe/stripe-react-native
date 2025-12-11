import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterial',
        headerLargeStyle: {
          backgroundColor: 'transparent',
        },
        headerStyle: {
          backgroundColor: 'transparent',
        },
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
