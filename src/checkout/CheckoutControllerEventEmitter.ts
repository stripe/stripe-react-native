import { addListener } from '../events';
import type { CheckoutElements } from '../types/CheckoutElements';

export interface CheckoutControllerUpdate {
  controllerId: string;
  status: CheckoutElements['status'];
  session: CheckoutElements.Session;
}

/** Creates identifiers for controllers and server-update operations. */
export function createCheckoutBridgeId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : (random % 4) + 8).toString(16);
    }
  );
}

/** Listens only to snapshots from this controller. */
export function addCheckoutControllerListener(
  controllerId: string,
  listener: (update: CheckoutControllerUpdate) => void
) {
  return addListener('checkoutControllerDidUpdate', (update) => {
    if (update.controllerId === controllerId) {
      listener(update);
    }
  });
}

/** Forwards the native immediate-action callback for this controller. */
export function addCheckoutControllerSelectionListener(
  controllerId: string,
  listener: (() => void) | undefined
) {
  return addListener('checkoutControllerDidSelectPaymentOption', (event) => {
    if (event.controllerId === controllerId) {
      listener?.();
    }
  });
}

/** Forwards inline Express Checkout payment results only to their owning controller. */
export function addCheckoutExpressResultListener(
  controllerId: string,
  listener: ((result: CheckoutElements.Result) => void) | undefined
) {
  return addListener('checkoutExpressCheckoutDidComplete', (event) => {
    if (event.controllerId === controllerId) {
      listener?.(event.result);
    }
  });
}
