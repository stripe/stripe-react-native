import type { Checkout } from '../types/Checkout';
import type { StripeError } from '../types/Errors';

export const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';

export function createCheckoutNotImplementedError(): Error {
  return new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
}

export function createCheckoutNotImplementedStripeError(): StripeError<Checkout.ErrorCode> {
  return {
    code: 'Failed',
    message: CHECKOUT_NOT_IMPLEMENTED_MESSAGE,
  };
}
