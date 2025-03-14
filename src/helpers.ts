import type React from 'react';
import type { StripeError } from './types';

import { Platform, NativeModules } from 'react-native';
// @ts-ignore TextInputState has no type definition
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';

/**
 * Determines whether or not this library is being used inside of
 * an "Expo" project by identifying if Expo's native module
 * infrastructure (react-native-unimodules AKA expo-modules) is available.
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

export const unsupportedMethodMessage = (field: string) =>
  `${field} method is not supported. Consider to upgrade react-native version to 0.63.x or higher`;

export const focusInput = (ref: React.MutableRefObject<any>) => {
  if ('focusInput' in TextInputState) {
    TextInputState.focusInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('focusInput'));
    }
  }
};

export const registerInput = (ref: React.MutableRefObject<any>) => {
  if ('registerInput' in TextInputState) {
    TextInputState.registerInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('registerInput'));
    }
  }
};

export const unregisterInput = (ref: React.MutableRefObject<any>) => {
  if ('unregisterInput' in TextInputState) {
    TextInputState.unregisterInput(ref);
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('unregisterInput'));
    }
  }
};

export const currentlyFocusedInput = () => {
  if ('currentlyFocusedInput' in TextInputState) {
    return TextInputState.currentlyFocusedInput();
  } else {
    if (__DEV__) {
      console.log(unsupportedMethodMessage('currentlyFocusedInput'));
    }
  }
};
