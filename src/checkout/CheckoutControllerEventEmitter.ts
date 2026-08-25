import { addListener } from '../events';
import type { Checkout, CheckoutController } from '../types/Checkout';

declare const checkoutControllerIdBrand: unique symbol;

/** An opaque identifier assigned by the native Checkout controller registry. */
export type CheckoutControllerId = string & {
  readonly [checkoutControllerIdBrand]: true;
};

/** A complete Checkout controller snapshot emitted by the native bridge. */
export interface CheckoutControllerUpdate {
  controllerId: CheckoutControllerId;
  sequence: number;
  status: CheckoutController['status'];
  session: Checkout.Session;
}

/** Converts the identifier returned by native controller creation. */
export const toCheckoutControllerId = (
  controllerId: string
): CheckoutControllerId => controllerId as CheckoutControllerId;

type CheckoutControllerListener = (update: CheckoutControllerUpdate) => void;

interface CheckoutControllerSubscription {
  remove(): void;
}

const latestUpdates = new Map<CheckoutControllerId, CheckoutControllerUpdate>();
const controllerListeners = new Map<
  CheckoutControllerId,
  Set<CheckoutControllerListener>
>();

// Register once when this module loads so updates emitted during native
// controller creation are buffered before JavaScript receives the controller ID.
addListener('checkoutControllerDidUpdate', (update) => {
  if (!Number.isSafeInteger(update.sequence) || update.sequence <= 0) {
    return;
  }

  const latestUpdate = latestUpdates.get(update.controllerId);
  if (latestUpdate && update.sequence <= latestUpdate.sequence) {
    return;
  }

  latestUpdates.set(update.controllerId, update);
  const listeners = controllerListeners.get(update.controllerId);
  if (listeners) {
    [...listeners].forEach((listener) => listener(update));
  }
});

/**
 * Subscribes to ordered updates for one Checkout controller.
 *
 * Native assigns a monotonically increasing sequence number to each
 * controller's updates. Delayed or duplicate updates are ignored here before
 * they can change JavaScript state.
 */
export function addCheckoutControllerListener(
  controllerId: CheckoutControllerId,
  listener: CheckoutControllerListener
): CheckoutControllerSubscription {
  let listeners = controllerListeners.get(controllerId);
  if (!listeners) {
    listeners = new Set();
    controllerListeners.set(controllerId, listeners);
  }
  listeners.add(listener);

  const latestUpdate = latestUpdates.get(controllerId);
  if (latestUpdate) {
    listener(latestUpdate);
  }

  return {
    remove: () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) {
        controllerListeners.delete(controllerId);
      }
      listeners = undefined;
    },
  };
}

/** Forgets buffered state and listeners after a controller is destroyed. */
export function clearCheckoutControllerUpdate(
  controllerId: CheckoutControllerId
): void {
  latestUpdates.delete(controllerId);
  controllerListeners.delete(controllerId);
}
