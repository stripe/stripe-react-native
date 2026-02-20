import * as RNLocalize from 'react-native-localize';

/**
 * Get the locale's decimal and group separators
 * Uses react-native-localize for reliable locale detection
 */
const getSeparators = (): { decimal: string; group: string } => {
  try {
    const settings = RNLocalize.getNumberFormatSettings();
    return {
      decimal: settings.decimalSeparator,
      group: settings.groupingSeparator,
    };
  } catch (error) {
    // Fallback to US format
    return { decimal: '.', group: ',' };
  }
};

/**
 * Parse a dollar amount string to a number using locale-aware parsing
 * Uses Intl.NumberFormat to detect and handle locale-specific formatting
 * @param value - The dollar amount string
 * @param defaultValue - The default value if parsing fails
 * @returns The parsed number value
 */
export const parseDollars = (value?: string, defaultValue = 0): number => {
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  try {
    const { decimal, group } = getSeparators();

    // Remove group separators and replace decimal separator with '.'
    let normalized = value;
    if (group) {
      normalized = normalized.replace(new RegExp(`\\${group}`, 'g'), '');
    }
    normalized = normalized.replace(new RegExp(`\\${decimal}`), '.');

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    // Fallback: try parsing as-is
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
};

/**
 * Format a number to a string using the locale's decimal separator
 * Uses react-native-localize for proper locale formatting
 * @param value - The number to format
 * @returns The formatted string with the locale's decimal separator
 */
export const formatDollarsForInput = (value: number): string => {
  try {
    const { decimal } = getSeparators();

    // Convert number to string and replace decimal point with locale separator
    const str = value.toString();
    return str.replace('.', decimal);
  } catch (error) {
    // Fallback to toString
    return value.toString();
  }
};
