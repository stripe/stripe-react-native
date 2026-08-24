import type { EventSubscription } from 'react-native';
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

/**
 * Subscribes to ordered updates for one Checkout controller.
 *
 * Native assigns a monotonically increasing sequence number to each
 * controller's updates. Delayed or duplicate updates are ignored here before
 * they can change JavaScript state.
 */
export function addCheckoutControllerListener(
  controllerId: CheckoutControllerId,
  listener: (update: CheckoutControllerUpdate) => void
): EventSubscription {
  let latestSequence = 0;

  return addListener('checkoutControllerDidUpdate', (update) => {
    if (update.controllerId !== controllerId) {
      return;
    }

    if (
      !Number.isSafeInteger(update.sequence) ||
      update.sequence <= latestSequence
    ) {
      return;
    }

    latestSequence = update.sequence;
    listener(update);
  });
}
