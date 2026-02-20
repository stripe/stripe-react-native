import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import ConnectAccountOnboardingView from '../../src/connect/ConnectAccountOnboardingView';
import ConnectPaymentsView from '../../src/connect/ConnectPaymentsView';
import ConnectPayoutsView from '../../src/connect/ConnectPayoutsView';
import { Colors } from '../../src/constants/colors';
import { useSettings } from '../../src/contexts/SettingsContext';

type ComponentType = 'onboarding' | 'payments' | 'payouts';

const COMPONENT_CONFIG: Record<
  ComponentType,
  { title: string; label: string }
> = {
  onboarding: { title: 'Account Onboarding', label: 'Onboarding' },
  payments: { title: 'Payments', label: 'Payments' },
  payouts: { title: 'Payouts', label: 'Payouts' },
};

export default function DynamicComponentTab() {
  const router = useRouter();
  const { component } = useLocalSearchParams<{ component: string }>();
  const { viewControllerSettings } = useSettings();

  const componentType = (component || 'onboarding') as ComponentType;
  const config = COMPONENT_CONFIG[componentType];
  const isModal = viewControllerSettings.presentationType === 'present_modally';
  const showHeader = viewControllerSettings.embedInNavigationBar;

  const renderComponent = () => {
    switch (componentType) {
      case 'onboarding':
        return <ConnectAccountOnboardingView />;
      case 'payments':
        return <ConnectPaymentsView />;
      case 'payouts':
        return <ConnectPayoutsView />;
      default:
        return <ConnectAccountOnboardingView />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: config.title,
          headerShown: showHeader,
          headerTransparent: true,
          headerBlurEffect: 'systemChromeMaterial',
          headerLargeStyle: {
            backgroundColor: 'transparent',
          },
          headerStyle: {
            backgroundColor: 'transparent',
          },
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
                        tintColor={Colors.icon.primary}
                        style={styles.symbolView}
                      />
                    ) : (
                      <Text style={styles.headerIcon}>✕</Text>
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
                      tintColor={Colors.icon.primary}
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
      {renderComponent()}
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
