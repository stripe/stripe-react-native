import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <SettingsProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </SettingsProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}
