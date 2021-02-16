import { Platform } from 'react-native';
import type { StripeError } from './types';

export const isiOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function createError<T>(error: StripeError<T>) {
  return {
    code: error.code,
    message: error.message,
  };
}
