import { Platform, PlatformColor, useColorScheme } from 'react-native';
import type { ColorValue } from 'react-native';

export type AppThemeColors = {
  background: ColorValue;
  card: ColorValue;
  text: ColorValue;
  secondaryText: ColorValue;
  separator: ColorValue;
};

export function useAppThemeColors(): AppThemeColors {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Prefer iOS dynamic system colors so the UI matches the user's settings
  // (Dark Mode, Increased Contrast, etc.) automatically.
  if (Platform.OS === 'ios') {
    return {
      background: PlatformColor('systemBackground'),
      card: PlatformColor('secondarySystemBackground'),
      text: PlatformColor('label'),
      secondaryText: PlatformColor('secondaryLabel'),
      separator: PlatformColor('separator'),
    };
  }

  return {
    background: isDark ? '#000000' : '#ffffff',
    card: isDark ? '#111111' : '#f2f2f7',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    separator: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
  };
}
