import React from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { useAppThemeColors } from './src/utils/theme';

export default function App() {
  const colors = useAppThemeColors();
  const isDarkMode = useColorScheme() === 'dark';

  const statusBarBackgroundColor =
    Platform.OS === 'android' && typeof colors.background === 'string'
      ? colors.background
      : undefined;

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={statusBarBackgroundColor}
      />
      <HomeScreen />
    </>
  );
}
