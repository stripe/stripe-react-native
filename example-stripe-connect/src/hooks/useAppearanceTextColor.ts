import { useSettings } from '../contexts/SettingsContext';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
import { Colors } from '../constants/colors';

/**
 * Hook to get the text color from the current appearance preset.
 * Falls back to the default icon color if no text color is defined.
 */
export function useAppearanceTextColor(): string {
  const { appearancePreset } = useSettings();
  const appearanceVariables = APPEARANCE_PRESETS[appearancePreset] || {};
  return appearanceVariables.colorText || Colors.icon.primary;
}
