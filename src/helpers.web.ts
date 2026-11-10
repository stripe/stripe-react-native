import type React from 'react';
import type { StripeError } from './types';

export const shouldAttributeExpo = () => false;

export const isiOS = false;
export const isAndroid = false;

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
  `${field} method is not supported on web.`;

export const focusInput = (_ref: React.MutableRefObject<any>) => {};
export const registerInput = (_ref: React.MutableRefObject<any>) => {};
export const unregisterInput = (_ref: React.MutableRefObject<any>) => {};
export const currentlyFocusedInput = () => null;
