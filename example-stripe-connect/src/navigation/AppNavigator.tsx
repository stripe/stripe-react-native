import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AccountOnboardingScreen from '../screens/AccountOnboardingScreen';
import PayoutsScreen from '../screens/PayoutsScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingSettingsScreen from '../screens/OnboardingSettingsScreen';
import PaymentsFilterSettingsScreen from '../screens/PaymentsFilterSettingsScreen';
import ViewControllerOptionsScreen from '../screens/ViewControllerOptionsScreen';
import ConfigureAppearanceScreen from '../screens/ConfigureAppearanceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const SettingsStack = createNativeStackNavigator();

// Settings modal with its own stack for sub-screens
const SettingsModalStack: React.FC = () => {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <SettingsStack.Screen
        name="OnboardingSettings"
        component={OnboardingSettingsScreen}
        options={{ title: 'Onboarding Settings' }}
      />
      <SettingsStack.Screen
        name="PaymentsFilterSettings"
        component={PaymentsFilterSettingsScreen}
        options={{ title: 'Payments Filter Settings' }}
      />
      <SettingsStack.Screen
        name="ViewControllerOptions"
        component={ViewControllerOptionsScreen}
        options={{ title: 'View Controller Options' }}
      />
    </SettingsStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="AccountOnboarding"
          component={AccountOnboardingScreen}
          options={{ title: 'Account Onboarding' }}
        />
        <Stack.Screen
          name="Payouts"
          component={PayoutsScreen}
          options={{ title: 'Payouts' }}
        />
        <Stack.Screen
          name="Payments"
          component={PaymentsScreen}
          options={{ title: 'Payments' }}
        />

        {/* Modal screens */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen
            name="Settings"
            component={SettingsModalStack}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ConfigureAppearance"
            component={ConfigureAppearanceScreen}
            options={{ title: 'Configure Appearance' }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
