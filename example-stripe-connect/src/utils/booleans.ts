/**
 * Convert a boolean value to a string representation for dropdowns
 * @param value - The boolean value (true or false)
 * @returns 'true' or 'false'
 */
export const booleanToString = (value: boolean): string => {
  return value ? 'true' : 'false';
};

/**
 * Convert a string representation back to a boolean value
 * @param value - The string value ('true' or 'false')
 * @returns The boolean value
 */
export const stringToBoolean = (value: string): boolean => {
  return value === 'true';
};

/**
 * Format a boolean value for display
 * @param value - The boolean value (true or false)
 * @returns 'True' or 'False'
 */
export const formatBooleanDisplay = (value: boolean): string => {
  return value ? 'True' : 'False';
};
