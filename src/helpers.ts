import type { StripeError } from './types';
import { Platform } from 'react-native';

export const isiOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function createError<T>(error: StripeError<T>) {
  return {
    code: error.code,
    message: error.message,
  };
}

/**
 * @param packageJSON
 * @returns 'expo bare' if the app is in the bare workflow, 'expo managed' if
 * it is in the managed workflow, and an empty string if the app is neither
 */
export function getExpoAttribution(packageJSON: Record<string, any>): string {
  if (isExpoManaged(packageJSON)) {
    return 'expo managed';
  } else if (isExpoBare(packageJSON)) {
    return 'expo bare';
  } else {
    return '';
  }
}

function isExpoManaged(packageJSON: Record<string, any>): boolean {
  if (
    packageJSON.hasOwnProperty('dependencies') &&
    packageJSON.dependencies.hasOwnProperty('react-native')
  ) {
    return packageJSON.dependencies['react-native'].includes('expo');
  }
  return false;
}

function isExpoBare(packageJSON: Record<string, any>): boolean {
  return (
    packageJSON.hasOwnProperty('dependencies') &&
    packageJSON.dependencies.hasOwnProperty('expo')
  );
}
