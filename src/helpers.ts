import type { StripeError } from './types';
import { Platform, NativeModules } from 'react-native';

/**
 * Determines whether or not this library is being used inside of
 * an "Expo" project by identifying if Expo's native module
 * infrastructure (react-native-unimodules) is available.
 */
export const shouldAttributeExpo = () => {
  try {
    return !!NativeModules.NativeUnimoduleProxy;
  } catch {
    return false;
  }
};

export const isiOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function createError<T>(error: StripeError<T>) {
  return {
    code: error.code,
    message: error.message,
    localizedMessage: error.localizedMessage,
    declineCode: error.declineCode,
    stripeErrorCode: error.stripeErrorCode,
    type: error.type,
  };
}
