import type { StripeError } from './types';
import { Platform } from 'react-native';
let isExpoInstalled = true;
try {
  require('expo');
} catch {
  isExpoInstalled = false;
}

export const shouldAttributeExpo = isExpoInstalled;
export const isiOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function createError<T>(error: StripeError<T>) {
  return {
    code: error.code,
    message: error.message,
  };
}
